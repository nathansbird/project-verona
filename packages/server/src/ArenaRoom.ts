import colyseus from 'colyseus';
const { Room } = colyseus;
type Client = colyseus.Client;
import {
  ArenaState,
  ShipSchema,
  StructureSchema,
  FootprintPoint,
  INPUT_MESSAGE,
  INPUT_ACK,
  PROJECTILE_SPAWN,
  PROJECTILE_HIT,
  InputBatch,
  InputFrame,
  ProjectileSpawnEvent,
  ProjectileHitEvent,
  SIM_TICK_HZ,
  SIM_TICK_SECONDS,
  BROADCAST_TICK_HZ,
  DEFAULT_AMMO,
  DEFAULT_HEALTH,
  PROJECTILE_DAMAGE,
  PROJECTILE_SPAWN_COOLDOWN_SECONDS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME_SECONDS,
  SimWorld,
  Ship,
  Projectile,
  createStructureBody,
} from '@glide/shared';
import { DEFAULT_WORLD } from './sim/worldLayout.js';

interface PendingInput {
  sessionId: string;
  frame: InputFrame;
}

interface ShipRuntime {
  ship: Ship;
  shotCooldown: number;
  holdingFire: boolean;
}

export class ArenaRoom extends Room<ArenaState> {
  private sim = new SimWorld();
  private ships = new Map<string, ShipRuntime>();
  private projectiles = new Map<string, Projectile>();
  private inputQueue: PendingInput[] = [];
  private tickCount = 0;
  private accumulatorMs = 0;
  private nextProjectileId = 1;
  private readonly simIntervalMs = 1000 / SIM_TICK_HZ;
  private readonly broadcastEveryNTicks = Math.round(SIM_TICK_HZ / BROADCAST_TICK_HZ);
  private readonly projectileLifetimeTicks = Math.round(PROJECTILE_LIFETIME_SECONDS * SIM_TICK_HZ);

  onCreate(): void {
    this.setState(new ArenaState());
    this.setPatchRate(1000 / BROADCAST_TICK_HZ);

    for (const def of DEFAULT_WORLD) {
      createStructureBody(this.sim.world, def);
      const schema = new StructureSchema();
      schema.id = def.id;
      schema.depth = def.depth;
      for (const p of def.footprint) {
        const fp = new FootprintPoint();
        fp.x = p.x;
        fp.y = p.y;
        schema.footprint.push(fp);
      }
      this.state.structures.set(def.id, schema);
    }

    this.sim.world.on('begin-contact', (contact) => this.handleContact(contact));

    this.onMessage(INPUT_MESSAGE, (client, batch: InputBatch) => {
      for (const frame of batch.frames) {
        this.inputQueue.push({ sessionId: client.sessionId, frame });
      }
    });

    this.setSimulationInterval((dt) => this.onSimulationFrame(dt), this.simIntervalMs);
  }

  onJoin(client: Client): void {
    const ship = new Ship(this.sim.world, 0, 0);
    this.ships.set(client.sessionId, { ship, shotCooldown: 0, holdingFire: false });

    const schema = new ShipSchema();
    schema.sessionId = client.sessionId;
    schema.health = DEFAULT_HEALTH;
    schema.ammo = DEFAULT_AMMO;
    this.state.ships.set(client.sessionId, schema);
  }

  onLeave(client: Client): void {
    const entry = this.ships.get(client.sessionId);
    if (entry) {
      this.sim.world.destroyBody(entry.ship.body);
      this.ships.delete(client.sessionId);
    }
    this.state.ships.delete(client.sessionId);
    this.inputQueue = this.inputQueue.filter((i) => i.sessionId !== client.sessionId);
  }

  private onSimulationFrame(dt: number): void {
    this.accumulatorMs += dt;
    while (this.accumulatorMs >= this.simIntervalMs) {
      this.accumulatorMs -= this.simIntervalMs;
      this.runSimTick();
    }
  }

  private runSimTick(): void {
    this.tickCount += 1;
    this.state.serverTick = this.tickCount;

    const perShip = new Map<string, InputFrame>();
    for (const pending of this.inputQueue) {
      const existing = perShip.get(pending.sessionId);
      if (!existing || pending.frame.seq > existing.seq) {
        perShip.set(pending.sessionId, pending.frame);
      }
    }
    this.inputQueue = [];

    for (const [sessionId, entry] of this.ships) {
      const frame = perShip.get(sessionId);
      if (frame) {
        entry.ship.applyInput(frame);
        entry.holdingFire = frame.shoot;
      }
    }

    this.sim.step();

    for (const [sessionId, entry] of this.ships) {
      if (entry.shotCooldown > 0) entry.shotCooldown -= SIM_TICK_SECONDS;
      const schema = this.state.ships.get(sessionId);
      if (!schema) continue;
      if (entry.holdingFire && entry.shotCooldown <= 0 && schema.ammo > 0) {
        this.spawnProjectile(sessionId, entry);
        entry.shotCooldown = PROJECTILE_SPAWN_COOLDOWN_SECONDS;
        schema.ammo -= 1;
      }
    }

    for (const [id, p] of this.projectiles) {
      if (this.tickCount >= p.data.despawnTick) {
        this.sim.world.destroyBody(p.body);
        this.projectiles.delete(id);
      }
    }

    for (const [sessionId, entry] of this.ships) {
      const schema = this.state.ships.get(sessionId);
      if (!schema) continue;
      const s = entry.ship.getState();
      schema.x = s.x;
      schema.y = s.y;
      schema.vx = s.vx;
      schema.vy = s.vy;
      schema.rotation = s.rotation;
      schema.rotationV = s.rotationV;
    }

    if (this.tickCount % this.broadcastEveryNTicks === 0) {
      for (const [sessionId, entry] of this.ships) {
        const client = this.clients.find((c) => c.sessionId === sessionId);
        if (client) client.send(INPUT_ACK, { lastSeq: entry.ship.lastInputSeq });
      }
    }
  }

  private spawnProjectile(ownerId: string, entry: ShipRuntime): void {
    const state = entry.ship.getState();
    const fx = Math.cos(state.rotation);
    const fy = Math.sin(state.rotation);
    const id = `p${this.nextProjectileId++}`;
    const init = {
      id,
      ownerSessionId: ownerId,
      x: state.x + fx * 30,
      y: state.y + fy * 30,
      vx: state.vx + fx * PROJECTILE_SPEED,
      vy: state.vy + fy * PROJECTILE_SPEED,
      spawnTick: this.tickCount,
      despawnTick: this.tickCount + this.projectileLifetimeTicks,
    };
    const projectile = new Projectile(this.sim.world, init);
    this.projectiles.set(id, projectile);

    const event: ProjectileSpawnEvent = init;
    this.broadcast(PROJECTILE_SPAWN, event);
  }

  private handleContact(contact: any): void {
    const a = contact.getFixtureA().getBody().getUserData() as any;
    const b = contact.getFixtureB().getBody().getUserData() as any;
    const [p, other] =
      a?.kind === 'projectile' ? [a, b] : b?.kind === 'projectile' ? [b, a] : [null, null];
    if (!p) return;
    if (other?.kind === 'ship') {
      this.onProjectileHitsShip(p.id, p.ownerSessionId, other);
    } else if (other?.kind === 'structure') {
      this.removeProjectile(p.id);
    }
  }

  private onProjectileHitsShip(projectileId: string, ownerSessionId: string, shipUserData: any): void {
    const projectile = this.projectiles.get(projectileId);
    if (!projectile) return;
    const victimEntry = [...this.ships.entries()].find(
      ([, e]) => e.ship.body.getUserData() === shipUserData,
    );
    if (!victimEntry) return;
    const [victimSessionId] = victimEntry;
    if (victimSessionId === ownerSessionId) return;

    const victimSchema = this.state.ships.get(victimSessionId);
    if (victimSchema) victimSchema.health = Math.max(0, victimSchema.health - PROJECTILE_DAMAGE);

    const pos = projectile.body.getPosition();
    const event: ProjectileHitEvent = {
      id: projectileId,
      x: pos.x,
      y: pos.y,
      victimSessionId,
      ownerSessionId,
    };
    this.broadcast(PROJECTILE_HIT, event);
    this.removeProjectile(projectileId);
  }

  private removeProjectile(id: string): void {
    const projectile = this.projectiles.get(id);
    if (!projectile) return;
    this.sim.world.destroyBody(projectile.body);
    this.projectiles.delete(id);
  }
}
