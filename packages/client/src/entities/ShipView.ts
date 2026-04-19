import { Graphics, Container } from 'pixi.js';

export class ShipView {
  readonly container: Container;
  private body: Graphics;

  constructor() {
    this.container = new Container();
    this.body = new Graphics();
    this.drawWireframe();
    this.container.addChild(this.body);
  }

  private drawWireframe(): void {
    this.body
      .moveTo(0, -25)
      .lineTo(-15, 10)
      .lineTo(0, 0)
      .lineTo(15, 10)
      .lineTo(0, -25)
      .stroke({ width: 2, color: 0xffffff });
    this.body.moveTo(0, -10).lineTo(0, 1).stroke({ width: 2, color: 0xffffff });
  }

  setTransform(x: number, y: number, rotation: number): void {
    this.container.position.set(x, y);
    this.container.rotation = rotation + Math.PI / 2;
  }
}
