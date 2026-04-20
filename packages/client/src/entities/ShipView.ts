import { Graphics, Container } from 'pixi.js';
import { SHIP_MAX_SPEED, SHIP_TURN_RATE } from '@glide/shared';

export class ShipView {
  readonly container: Container;
  private body: Graphics;

  constructor() {
    this.container = new Container();
    this.body = new Graphics();
    this.container.addChild(this.body);
    this.redrawWireframe(0, 0);
  }

  private redrawWireframe(speed: number, rotationV: number): void {
    const speedFactor = Math.min(speed / SHIP_MAX_SPEED, 1);
    const turnFactor = Math.min(Math.abs(rotationV) / SHIP_TURN_RATE, 1);
    const wingY = 15 - speedFactor * 4 - turnFactor * 2;

    this.body.clear();
    this.body
      .moveTo(0, 0)
      .lineTo(-35, -wingY)
      .lineTo(-25, 0)
      .lineTo(-35, wingY)
      .lineTo(0, 0)
      .stroke({ width: 2, color: 0xffffff });
    this.body.moveTo(-15, 0).lineTo(-26, 0).stroke({ width: 2, color: 0xffffff });
  }

  setTransform(x: number, y: number, rotation: number, speed: number, rotationV: number): void {
    this.container.position.set(x, y);
    this.container.rotation = rotation;
    this.redrawWireframe(speed, rotationV);
  }
}
