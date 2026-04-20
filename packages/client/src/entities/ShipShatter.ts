import { Container, Graphics } from 'pixi.js';

interface Segment {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationV: number;
  halfLen: number;
}

interface ShatterOpts {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
}

const LIFE_SECONDS = 1.2;
const OUTWARD_SPEED = 140;
const JITTER_SPEED = 70;
const ANGULAR_JITTER = 6;
const LINE_DAMPING = 0.6;

const LOCAL_POINTS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, -35, -15],
  [-35, -15, -25, 0],
  [-25, 0, -35, 15],
  [-35, 15, 0, 0],
  [-15, 0, -26, 0],
];

export class ShipShatter {
  readonly container = new Container();
  private segments: Segment[] = [];
  private age = 0;
  private done = false;

  constructor(opts: ShatterOpts) {
    const cos = Math.cos(opts.rotation);
    const sin = Math.sin(opts.rotation);

    for (const [ax, ay, bx, by] of LOCAL_POINTS) {
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const dx = bx - ax;
      const dy = by - ay;
      const halfLen = Math.hypot(dx, dy) / 2;
      const localAngle = Math.atan2(dy, dx);

      const worldMx = opts.x + (mx * cos - my * sin);
      const worldMy = opts.y + (mx * sin + my * cos);

      // Outward radial push from ship center, in world space.
      const outLen = Math.hypot(mx, my) || 1;
      const outLx = mx / outLen;
      const outLy = my / outLen;
      const outWx = outLx * cos - outLy * sin;
      const outWy = outLx * sin + outLy * cos;

      const jitterAngle = Math.random() * Math.PI * 2;
      const jitterMag = Math.random() * JITTER_SPEED;

      const gfx = new Graphics();
      gfx
        .moveTo(-halfLen, 0)
        .lineTo(halfLen, 0)
        .stroke({ width: 2, color: 0xffffff });
      this.container.addChild(gfx);

      this.segments.push({
        gfx,
        x: worldMx,
        y: worldMy,
        vx: opts.vx + outWx * OUTWARD_SPEED + Math.cos(jitterAngle) * jitterMag,
        vy: opts.vy + outWy * OUTWARD_SPEED + Math.sin(jitterAngle) * jitterMag,
        rotation: opts.rotation + localAngle,
        rotationV: (Math.random() * 2 - 1) * ANGULAR_JITTER,
        halfLen,
      });
    }

    this.render();
  }

  update(dtSec: number): void {
    if (this.done) return;
    this.age += dtSec;

    const damping = Math.max(0, 1 - LINE_DAMPING * dtSec);
    for (const s of this.segments) {
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      s.vx *= damping;
      s.vy *= damping;
      s.rotation += s.rotationV * dtSec;
    }

    if (this.age >= LIFE_SECONDS) {
      this.done = true;
      this.container.destroy({ children: true });
      return;
    }
    this.render();
  }

  get finished(): boolean {
    return this.done;
  }

  private render(): void {
    const alpha = 1 - this.age / LIFE_SECONDS;
    for (const s of this.segments) {
      s.gfx.position.set(s.x, s.y);
      s.gfx.rotation = s.rotation;
      s.gfx.alpha = alpha;
    }
  }
}
