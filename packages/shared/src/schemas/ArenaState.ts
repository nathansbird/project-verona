import { Schema, type, MapSchema } from '@colyseus/schema';
import { ShipSchema } from './ShipSchema.js';
import { StructureSchema } from './StructureSchema.js';

export class ArenaState extends Schema {
  @type('number') serverTick = 0;
  @type({ map: ShipSchema }) ships = new MapSchema<ShipSchema>();
  @type({ map: StructureSchema }) structures = new MapSchema<StructureSchema>();
}
