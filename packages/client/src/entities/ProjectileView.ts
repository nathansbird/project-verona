import { Graphics } from 'pixi.js';

export class ProjectileView {
  readonly gfx: Graphics;

  constructor(color: number = 0xffffff) {
    this.gfx = new Graphics();
    this.draw(color);
  }

  private draw(color: number): void {
    this.gfx.moveTo(-10, 0).lineTo(10, 0).stroke({ width: 2, color });
  }

  setTransform(x: number, y: number, vx: number, vy: number): void {
    this.gfx.position.set(x, y);
    this.gfx.rotation = Math.atan2(vy, vx);
  }
}
