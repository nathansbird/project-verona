import { Body, Polygon, Vec2, World } from 'planck';
import {
  SHIP_HULL,
  SHIP_THRUST,
  SHIP_TURN_ACCEL,
  SHIP_TURN_RATE,
  SHIP_MAX_SPEED,
  SHIP_LINEAR_DAMPING,
  SHIP_ANGULAR_DAMPING,
} from '../constants.js';
import { Category, Mask } from '../collisionCategories.js';
import { InputFrame } from '../inputMessages.js';
import { clamp } from '../math.js';

export class Ship {
  readonly body: Body;
  readonly groupIndex: number;
  lastInputSeq = 0;

  constructor(world: World, spawnX: number, spawnY: number, groupIndex = 0) {
    this.groupIndex = groupIndex;
    this.body = world.createBody({
      type: 'dynamic',
      position: Vec2(spawnX, spawnY),
      linearDamping: SHIP_LINEAR_DAMPING,
      angularDamping: SHIP_ANGULAR_DAMPING,
      fixedRotation: false,
    });
    this.body.createFixture({
      shape: new Polygon(SHIP_HULL.map(([x, y]) => Vec2(x, y))),
      // Density calibrated so triangle mass matches the prior 20-radius
      // circle (area 1257 vs 525), preserving thrust-vs-mass feel.
      density: 0.0024,
      friction: 0.1,
      restitution: 0.3,
      filterCategoryBits: Category.SHIP,
      filterMaskBits: Mask.SHIP,
      filterGroupIndex: groupIndex,
    });
    this.body.setUserData({ kind: 'ship' });
  }

  applyInput(input: InputFrame): void {
    const angle = this.body.getAngle();
    if (input.accel) {
      const forward = Vec2(Math.cos(angle), Math.sin(angle));
      const force = Vec2(forward.x * SHIP_THRUST, forward.y * SHIP_THRUST);
      this.body.applyForceToCenter(force, true);
    }
    let angVel = this.body.getAngularVelocity();
    if (input.left) angVel -= SHIP_TURN_ACCEL * (1 / 30);
    if (input.right) angVel += SHIP_TURN_ACCEL * (1 / 30);
    angVel = clamp(angVel, -SHIP_TURN_RATE, SHIP_TURN_RATE);
    this.body.setAngularVelocity(angVel);

    if (input.brake) {
      const v = this.body.getLinearVelocity();
      this.body.setLinearVelocity(Vec2(v.x * 0.92, v.y * 0.92));
    }

    const v = this.body.getLinearVelocity();
    const speedSq = v.x * v.x + v.y * v.y;
    const maxSq = SHIP_MAX_SPEED * SHIP_MAX_SPEED;
    if (speedSq > maxSq) {
      const s = SHIP_MAX_SPEED / Math.sqrt(speedSq);
      this.body.setLinearVelocity(Vec2(v.x * s, v.y * s));
    }

    this.lastInputSeq = input.seq;
  }

  getState() {
    const p = this.body.getPosition();
    const v = this.body.getLinearVelocity();
    return {
      x: p.x,
      y: p.y,
      vx: v.x,
      vy: v.y,
      rotation: this.body.getAngle(),
      rotationV: this.body.getAngularVelocity(),
    };
  }
}
