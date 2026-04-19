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
  SHIP_DEATH,
  SHIP_RESPAWN,
  InputBatch,
  InputFrame,
  ProjectileSpawnEvent,
  ProjectileHitEvent,
  ShipDeathEvent,
  ShipRespawnEvent,
  SIM_TICK_HZ,
  SIM_TICK_SECONDS,
  BROADCAST_TICK_HZ,
  DEFAULT_AMMO,
  DEFAULT_HEALTH,
  PROJECTILE_DAMAGE,
  PROJECTILE_SPAWN_COOLDOWN_SECONDS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME_SECONDS,
  PROJECTILE_NOSE_OFFSET,
  RESPAWN_DELAY_SECONDS,
  SimWorld,
  Ship,
  Projectile,
  createStructureBody,
} from '@glide/shared';
import { DEFAULT_WORLD } from './sim/worldLayout.js';

const RESPAWN_INSET = 3000;

interface ShipRuntime {
  ship: Ship | null;
  groupIndex: number;
  shotCooldown: number;
  holdingFire: boolean;
  reloadHeld: boolean;
  inputBuffer: Map<number, InputFrame>;
  lastProcessedSeq: number;
  lastAppliedInput: InputFrame;
  respawnTick: number;
}

export class ArenaRoom extends Room<ArenaState> {
  private sim = new SimWorld();
  private ships = new Map<string, ShipRuntime>();
  private projectiles = new Map<string, Projectile>();
  private tickCount = 0;
  private accumulatorMs = 0;
  private nextProjectileId = 1;
  private nextShipGroup = -1;
  private readonly simIntervalMs = 1000 / SIM_TICK_HZ;
  private readonly broadcastEveryNTicks = Math.round(SIM_TICK_HZ / BROADCAST_TICK_HZ);
  private readonly projectileLifetimeTicks = Math.round(PROJECTILE_LIFETIME_SECONDS * SIM_TICK_HZ);
  private readonly respawnDelayTicks = Math.round(RESPAWN_DELAY_SECONDS * SIM_TICK_HZ);

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
      const entry = this.ships.get(client.sessionId);
      if (!entry) return;
      for (const frame of batch.frames) {
        if (frame.seq <= entry.lastProcessedSeq) continue;
        entry.inputBuffer.set(frame.seq, frame);
      }
    });

    this.setSimulationInterval((dt) => this.onSimulationFrame(dt), this.simIntervalMs);
  }

  onJoin(client: Client): void {
    const spawn = this.pickSpawnPoint();
    const groupIndex = this.nextShipGroup--;
    const ship = new Ship(this.sim.world, spawn.x, spawn.y, groupIndex);
    ship.body.setAngle(spawn.rotation);
    const idleInput: InputFrame = {
      seq: 0,
      accel: false,
      left: false,
      right: false,
      brake: false,
      shoot: false,
      reload: false,
    };
    this.ships.set(client.sessionId, {
      ship,
      groupIndex,
      shotCooldown: 0,
      holdingFire: false,
      reloadHeld: false,
      inputBuffer: new Map(),
      lastProcessedSeq: 0,
      lastAppliedInput: idleInput,
      respawnTick: -1,
    });

    const schema = new ShipSchema();
    schema.sessionId = client.sessionId;
    schema.health = DEFAULT_HEALTH;
    schema.ammo = DEFAULT_AMMO;
    schema.alive = true;
    schema.x = spawn.x;
    schema.y = spawn.y;
    schema.rotation = spawn.rotation;
    this.state.ships.set(client.sessionId, schema);
  }

  onLeave(client: Client): void {
    const entry = this.ships.get(client.sessionId);
    if (entry) {
      if (entry.ship) this.sim.world.destroyBody(entry.ship.body);
      this.ships.delete(client.sessionId);
    }
    this.state.ships.delete(client.sessionId);
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

    for (const [sessionId, entry] of this.ships) {
      const nextSeq = entry.lastProcessedSeq + 1;
      let frame = entry.inputBuffer.get(nextSeq);
      if (frame) {
        entry.inputBuffer.delete(nextSeq);
        entry.lastProcessedSeq = nextSeq;
        entry.lastAppliedInput = frame;
      } else {
        frame = entry.lastAppliedInput;
      }

      if (entry.ship) {
        entry.ship.applyInput(frame);
        entry.holdingFire = frame.shoot;

        if (frame.reload && !entry.reloadHeld) {
          const schema = this.state.ships.get(sessionId);
          if (schema) schema.ammo = DEFAULT_AMMO;
        }
        entry.reloadHeld = frame.reload;
      } else {
        entry.holdingFire = false;
        if (entry.respawnTick >= 0 && this.tickCount >= entry.respawnTick) {
          this.respawnShip(sessionId, entry);
        }
      }
    }

    this.sim.step();

    for (const [sessionId, entry] of this.ships) {
      if (entry.shotCooldown > 0) entry.shotCooldown -= SIM_TICK_SECONDS;
      if (!entry.ship) continue;
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
      if (!entry.ship) continue;
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
        if (client) client.send(INPUT_ACK, { lastSeq: entry.lastProcessedSeq });
      }
    }
  }

  private spawnProjectile(ownerId: string, entry: ShipRuntime): void {
    if (!entry.ship) return;
    const state = entry.ship.getState();
    const fx = Math.cos(state.rotation);
    const fy = Math.sin(state.rotation);
    const id = `p${this.nextProjectileId++}`;
    const init = {
      id,
      ownerSessionId: ownerId,
      x: state.x + fx * PROJECTILE_NOSE_OFFSET,
      y: state.y + fy * PROJECTILE_NOSE_OFFSET,
      vx: state.vx + fx * PROJECTILE_SPEED,
      vy: state.vy + fy * PROJECTILE_SPEED,
      spawnTick: this.tickCount,
      despawnTick: this.tickCount + this.projectileLifetimeTicks,
    };
    const projectile = new Projectile(this.sim.world, init, entry.groupIndex);
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
      ([, e]) => e.ship?.body.getUserData() === shipUserData,
    );
    if (!victimEntry) return;
    const [victimSessionId, victimRuntime] = victimEntry;
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

    if (victimSchema && victimSchema.alive && victimSchema.health <= 0) {
      this.killShip(victimSessionId, victimRuntime, ownerSessionId);
    }
  }

  private killShip(sessionId: string, entry: ShipRuntime, killerSessionId: string | null): void {
    if (!entry.ship) return;
    const final = entry.ship.getState();
    this.sim.world.destroyBody(entry.ship.body);
    entry.ship = null;
    entry.holdingFire = false;
    entry.reloadHeld = false;
    entry.inputBuffer.clear();
    entry.respawnTick = this.tickCount + this.respawnDelayTicks;

    const schema = this.state.ships.get(sessionId);
    if (schema) {
      schema.alive = false;
      schema.health = 0;
      schema.vx = 0;
      schema.vy = 0;
      schema.rotationV = 0;
    }

    const event: ShipDeathEvent = {
      sessionId,
      killerSessionId,
      x: final.x,
      y: final.y,
      vx: final.vx,
      vy: final.vy,
      rotation: final.rotation,
      rotationV: final.rotationV,
    };
    this.broadcast(SHIP_DEATH, event);
  }

  private respawnShip(sessionId: string, entry: ShipRuntime): void {
    const spawn = this.pickSpawnPoint();
    const ship = new Ship(this.sim.world, spawn.x, spawn.y, entry.groupIndex);
    ship.body.setAngle(spawn.rotation);
    entry.ship = ship;
    entry.respawnTick = -1;
    entry.shotCooldown = 0;

    const schema = this.state.ships.get(sessionId);
    if (schema) {
      schema.alive = true;
      schema.health = DEFAULT_HEALTH;
      schema.ammo = DEFAULT_AMMO;
      schema.x = spawn.x;
      schema.y = spawn.y;
      schema.vx = 0;
      schema.vy = 0;
      schema.rotation = spawn.rotation;
      schema.rotationV = 0;
    }

    const event: ShipRespawnEvent = {
      sessionId,
      x: spawn.x,
      y: spawn.y,
      rotation: spawn.rotation,
    };
    this.broadcast(SHIP_RESPAWN, event);
  }

  private pickSpawnPoint(): { x: number; y: number; rotation: number } {
    const x = (Math.random() * 2 - 1) * RESPAWN_INSET;
    const y = (Math.random() * 2 - 1) * RESPAWN_INSET;
    const rotation = Math.random() * Math.PI * 2;
    return { x, y, rotation };
  }

  private removeProjectile(id: string): void {
    const projectile = this.projectiles.get(id);
    if (!projectile) return;
    this.sim.world.destroyBody(projectile.body);
    this.projectiles.delete(id);
  }
}
