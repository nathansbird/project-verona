import { World, Vec2 } from 'planck';
import { SIM_TICK_SECONDS } from '../constants.js';

export class SimWorld {
  readonly world: World;

  constructor() {
    this.world = new World({ gravity: Vec2(0, 0) });
  }

  step(): void {
    this.world.step(SIM_TICK_SECONDS, 8, 3);
  }
}
