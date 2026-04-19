import { InputFrame } from '@glide/shared';
import { LocalShipSim } from '../sim/LocalShipSim.js';

interface ServerShipSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationV: number;
}

export class Prediction {
  readonly sim = new LocalShipSim();
  private unackedInputs: InputFrame[] = [];
  private lastAckedSeq = 0;

  pushInput(input: InputFrame): void {
    this.unackedInputs.push(input);
    this.sim.applyAndStep(input);
  }

  onAck(lastSeq: number): void {
    this.lastAckedSeq = lastSeq;
    this.unackedInputs = this.unackedInputs.filter((i) => i.seq > lastSeq);
  }

  reconcile(server: ServerShipSnapshot): void {
    this.sim.snapTo(server.x, server.y, server.vx, server.vy, server.rotation, server.rotationV);
    for (const input of this.unackedInputs) {
      this.sim.applyAndStep(input);
    }
  }

  get state() {
    return this.sim.ship.getState();
  }

  get lastSeq(): number {
    return this.lastAckedSeq;
  }
}
