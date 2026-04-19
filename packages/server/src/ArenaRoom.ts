import colyseus from 'colyseus';
const { Room } = colyseus;
type Client = colyseus.Client;
import {
  ArenaState,
  ShipSchema,
  INPUT_MESSAGE,
  INPUT_ACK,
  InputBatch,
  InputFrame,
  SIM_TICK_HZ,
  BROADCAST_TICK_HZ,
  DEFAULT_AMMO,
  DEFAULT_HEALTH,
  SimWorld,
  Ship,
} from '@glide/shared';

interface PendingInput {
  sessionId: string;
  frame: InputFrame;
}

export class ArenaRoom extends Room<ArenaState> {
  private sim = new SimWorld();
  private ships = new Map<string, Ship>();
  private inputQueue: PendingInput[] = [];
  private tickCount = 0;
  private accumulatorMs = 0;
  private readonly simIntervalMs = 1000 / SIM_TICK_HZ;
  private readonly broadcastEveryNTicks = Math.round(SIM_TICK_HZ / BROADCAST_TICK_HZ);

  onCreate(): void {
    this.setState(new ArenaState());
    this.setPatchRate(1000 / BROADCAST_TICK_HZ);
    this.onMessage(INPUT_MESSAGE, (client, batch: InputBatch) => {
      for (const frame of batch.frames) {
        this.inputQueue.push({ sessionId: client.sessionId, frame });
      }
    });
    this.setSimulationInterval((dt) => this.onSimulationFrame(dt), this.simIntervalMs);
  }

  onJoin(client: Client): void {
    const ship = new Ship(this.sim.world, 0, 0);
    this.ships.set(client.sessionId, ship);

    const schema = new ShipSchema();
    schema.sessionId = client.sessionId;
    schema.health = DEFAULT_HEALTH;
    schema.ammo = DEFAULT_AMMO;
    this.state.ships.set(client.sessionId, schema);
  }

  onLeave(client: Client): void {
    const ship = this.ships.get(client.sessionId);
    if (ship) {
      this.sim.world.destroyBody(ship.body);
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

    for (const [sessionId, frame] of perShip) {
      const ship = this.ships.get(sessionId);
      if (ship) ship.applyInput(frame);
    }

    this.sim.step();

    for (const [sessionId, ship] of this.ships) {
      const schema = this.state.ships.get(sessionId);
      if (!schema) continue;
      const s = ship.getState();
      schema.x = s.x;
      schema.y = s.y;
      schema.vx = s.vx;
      schema.vy = s.vy;
      schema.rotation = s.rotation;
      schema.rotationV = s.rotationV;
    }

    if (this.tickCount % this.broadcastEveryNTicks === 0) {
      for (const [sessionId, ship] of this.ships) {
        const client = this.clients.find((c) => c.sessionId === sessionId);
        if (client) client.send(INPUT_ACK, { lastSeq: ship.lastInputSeq });
      }
    }
  }
}
