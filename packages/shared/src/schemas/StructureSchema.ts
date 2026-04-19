import { Schema, type, ArraySchema } from '@colyseus/schema';

export class FootprintPoint extends Schema {
  @type('number') x = 0;
  @type('number') y = 0;
}

export class StructureSchema extends Schema {
  @type('string') id = '';
  @type([FootprintPoint]) footprint = new ArraySchema<FootprintPoint>();
  @type('number') depth = 4;
}
