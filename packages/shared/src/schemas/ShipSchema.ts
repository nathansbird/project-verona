import { Schema, type } from '@colyseus/schema';

export class ShipSchema extends Schema {
  @type('string') sessionId = '';
  @type('string') name = '';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('number') vx = 0;
  @type('number') vy = 0;
  @type('number') rotation = 0;
  @type('number') rotationV = 0;
  @type('number') health = 100;
  @type('number') ammo = 25;
  @type('boolean') alive = true;
  @type('boolean') shieldActive = false;
  @type('boolean') boostActive = false;
}
