import { Body, Vec2, World, Polygon, Edge } from 'planck';
import { Category, Mask } from '../collisionCategories.js';

export interface StructureDef {
  id: string;
  footprint: Array<{ x: number; y: number }>;
  depth: number;
}

export function createStructureBody(world: World, def: StructureDef): Body {
  const body = world.createBody({ type: 'static', position: Vec2(0, 0) });
  if (def.footprint.length === 2) {
    const [a, b] = def.footprint;
    body.createFixture({
      shape: new Edge(Vec2(a.x, a.y), Vec2(b.x, b.y)),
      filterCategoryBits: Category.STRUCTURE,
      filterMaskBits: Mask.STRUCTURE,
    });
  } else {
    body.createFixture({
      shape: new Polygon(def.footprint.map((p) => Vec2(p.x, p.y))),
      filterCategoryBits: Category.STRUCTURE,
      filterMaskBits: Mask.STRUCTURE,
    });
  }
  body.setUserData({ kind: 'structure', id: def.id });
  return body;
}
