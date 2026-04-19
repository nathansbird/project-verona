import { StructureDef, WORLD_BOUND as BOUND } from '@glide/shared';

export const DEFAULT_WORLD: StructureDef[] = [
  {
    id: 'arena-wall-n',
    footprint: [
      { x: -BOUND, y: -BOUND },
      { x: BOUND, y: -BOUND },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-s',
    footprint: [
      { x: -BOUND, y: BOUND },
      { x: BOUND, y: BOUND },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-e',
    footprint: [
      { x: BOUND, y: -BOUND },
      { x: BOUND, y: BOUND },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-w',
    footprint: [
      { x: -BOUND, y: -BOUND },
      { x: -BOUND, y: BOUND },
    ],
    depth: 6,
  },
];
