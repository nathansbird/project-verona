import { Body, Circle, Vec2, World } from 'planck';
import { Category, Mask } from '../collisionCategories.js';
import { PROJECTILE_RADIUS } from '../constants.js';

export interface ProjectileInit {
  id: string;
  ownerSessionId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnTick: number;
  despawnTick: number;
}

export class Projectile {
  readonly body: Body;
  readonly data: ProjectileInit;

  constructor(world: World, init: ProjectileInit, ownerGroupIndex = 0) {
    this.data = init;
    this.body = world.createBody({
      type: 'dynamic',
      position: Vec2(init.x, init.y),
      linearVelocity: Vec2(init.vx, init.vy),
      bullet: true,
    });
    this.body.createFixture({
      shape: new Circle(PROJECTILE_RADIUS),
      density: 0.001,
      friction: 0,
      restitution: 0,
      filterCategoryBits: Category.PROJECTILE,
      filterMaskBits: Mask.PROJECTILE,
      filterGroupIndex: ownerGroupIndex,
    });
    this.body.setUserData({ kind: 'projectile', id: init.id, ownerSessionId: init.ownerSessionId });
  }
}
