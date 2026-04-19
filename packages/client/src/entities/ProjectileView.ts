import { Graphics } from 'pixi.js';

export class ProjectileView {
  readonly gfx: Graphics;

  constructor() {
    this.gfx = new Graphics();
    this.draw();
  }

  private draw(): void {
    this.gfx.moveTo(-6, 0).lineTo(6, 0).stroke({ width: 2, color: 0xffffff });
  }

  setTransform(x: number, y: number, vx: number, vy: number): void {
    this.gfx.position.set(x, y);
    this.gfx.rotation = Math.atan2(vy, vx);
  }
}
