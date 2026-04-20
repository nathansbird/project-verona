import { World, Vec2, Settings } from 'planck';
import { SIM_TICK_SECONDS } from '../constants.js';

// Planck inherits Box2D's default maxTranslation = 2 units/step,
// which clamps speed to ~60 u/s at 30Hz. Raise it so our speed
// constants are actually honored.
Settings.maxTranslation = 1000;

export class SimWorld {
  readonly world: World;

  constructor() {
    this.world = new World({ gravity: Vec2(0, 0) });
  }

  step(): void {
    this.world.step(SIM_TICK_SECONDS, 8, 3);
  }
}
