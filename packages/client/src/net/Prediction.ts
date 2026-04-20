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

interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationV: number;
}

function zeroState(): ShipState {
  return { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, rotationV: 0 };
}

function shortAngleDelta(a: number, b: number): number {
  const TWO_PI = Math.PI * 2;
  let d = (b - a) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

// Sub-threshold deltas are treated as FP noise between client and server sim
// and ignored entirely — the client keeps its local prediction.
const POS_DEAD_ZONE = 6;
const ROT_DEAD_ZONE = 0.04;
// Rate at which a render offset eases to zero (per second).
const RENDER_OFFSET_DECAY_PER_SECOND = 6;

export class Prediction {
  readonly sim = new LocalShipSim();
  private unackedInputs: InputFrame[] = [];
  private lastAckedSeq = 0;
  private prev: ShipState = zeroState();
  private curr: ShipState = zeroState();
  private renderOffsetX = 0;
  private renderOffsetY = 0;
  private renderOffsetRot = 0;

  pushInput(input: InputFrame): void {
    this.unackedInputs.push(input);
    this.prev = this.curr;
    this.sim.applyAndStep(input);
    this.curr = this.sim.ship.getState();
  }

  onAck(lastSeq: number): void {
    this.lastAckedSeq = lastSeq;
    this.unackedInputs = this.unackedInputs.filter((i) => i.seq > lastSeq);
  }

  snap(server: ServerShipSnapshot): void {
    this.sim.snapTo(server.x, server.y, server.vx, server.vy, server.rotation, server.rotationV);
    const state = this.sim.ship.getState();
    this.prev = state;
    this.curr = state;
    this.renderOffsetX = 0;
    this.renderOffsetY = 0;
    this.renderOffsetRot = 0;
    this.unackedInputs = [];
  }

  reconcile(server: ServerShipSnapshot, alpha: number): void {
    // Where we're visibly displaying the ship right now (including any
    // in-progress smoothing).
    const oldRender = this.getRenderState(alpha);

    // Save pre-reconcile sim state so we can restore it if the correction
    // turns out to be sub-threshold.
    const preSim = this.sim.ship.getState();

    this.sim.snapTo(server.x, server.y, server.vx, server.vy, server.rotation, server.rotationV);
    for (const input of this.unackedInputs) {
      this.sim.applyAndStep(input);
    }
    const post = this.sim.ship.getState();

    const dx = oldRender.x - post.x;
    const dy = oldRender.y - post.y;
    const drot = shortAngleDelta(post.rotation, oldRender.rotation);
    const posMag = Math.hypot(dx, dy);

    if (posMag < POS_DEAD_ZONE && Math.abs(drot) < ROT_DEAD_ZONE) {
      // Dead zone: FP-noise level disagreement. Trust client — rewind sim
      // to its pre-reconcile state so the render stays perfectly stable.
      this.sim.snapTo(
        preSim.x,
        preSim.y,
        preSim.vx,
        preSim.vy,
        preSim.rotation,
        preSim.rotationV,
      );
      return;
    }

    // Real divergence (collision, push, missed input). Snap sim to the
    // authoritative state but offset the render so it stays continuous
    // and eases into the new truth.
    this.renderOffsetX = dx;
    this.renderOffsetY = dy;
    this.renderOffsetRot = drot;

    this.prev = post;
    this.curr = post;
  }

  decayError(dtSeconds: number): void {
    const factor = Math.max(0, 1 - dtSeconds * RENDER_OFFSET_DECAY_PER_SECOND);
    this.renderOffsetX *= factor;
    this.renderOffsetY *= factor;
    this.renderOffsetRot *= factor;
    if (Math.abs(this.renderOffsetX) < 0.05) this.renderOffsetX = 0;
    if (Math.abs(this.renderOffsetY) < 0.05) this.renderOffsetY = 0;
    if (Math.abs(this.renderOffsetRot) < 0.0005) this.renderOffsetRot = 0;
  }

  getRenderState(alpha: number): ShipState {
    const a = Math.min(1, Math.max(0, alpha));
    return {
      x: this.prev.x + (this.curr.x - this.prev.x) * a + this.renderOffsetX,
      y: this.prev.y + (this.curr.y - this.prev.y) * a + this.renderOffsetY,
      vx: this.prev.vx + (this.curr.vx - this.prev.vx) * a,
      vy: this.prev.vy + (this.curr.vy - this.prev.vy) * a,
      rotation:
        this.prev.rotation +
        shortAngleDelta(this.prev.rotation, this.curr.rotation) * a +
        this.renderOffsetRot,
      rotationV: this.prev.rotationV + (this.curr.rotationV - this.prev.rotationV) * a,
    };
  }

  getSimInterpState(alpha: number): ShipState {
    const a = Math.min(1, Math.max(0, alpha));
    return {
      x: this.prev.x + (this.curr.x - this.prev.x) * a,
      y: this.prev.y + (this.curr.y - this.prev.y) * a,
      vx: this.prev.vx + (this.curr.vx - this.prev.vx) * a,
      vy: this.prev.vy + (this.curr.vy - this.prev.vy) * a,
      rotation:
        this.prev.rotation + shortAngleDelta(this.prev.rotation, this.curr.rotation) * a,
      rotationV: this.prev.rotationV + (this.curr.rotationV - this.prev.rotationV) * a,
    };
  }

  get lastSeq(): number {
    return this.lastAckedSeq;
  }
}
