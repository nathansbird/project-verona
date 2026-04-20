import { Container, Application } from 'pixi.js';
import { SHIP_MAX_SPEED } from '@glide/shared';

export class Camera {
  constructor(
    private app: Application,
    private worldContainer: Container,
  ) {}

  update(x: number, y: number, rotation: number, speed: number): void {
    const zoom = 1.2 - Math.min(speed / SHIP_MAX_SPEED, 1) / 3;
    this.worldContainer.pivot.set(x, y);
    this.worldContainer.rotation = -rotation - Math.PI / 2;
    this.worldContainer.scale.set(zoom);
    this.worldContainer.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
  }
}
