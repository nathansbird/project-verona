import { World, Vec2 } from 'planck';
import { SIM_TICK_SECONDS, InputFrame, Ship } from '@glide/shared';

export class LocalShipSim {
  private world = new World({ gravity: Vec2(0, 0) });
  ship: Ship;

  constructor() {
    this.ship = new Ship(this.world, 0, 0);
  }

  snapTo(x: number, y: number, vx: number, vy: number, rotation: number, rotationV: number): void {
    this.ship.body.setPosition(Vec2(x, y));
    this.ship.body.setLinearVelocity(Vec2(vx, vy));
    this.ship.body.setAngle(rotation);
    this.ship.body.setAngularVelocity(rotationV);
  }

  applyAndStep(input: InputFrame): void {
    this.ship.applyInput(input);
    this.world.step(SIM_TICK_SECONDS, 8, 3);
  }
}
