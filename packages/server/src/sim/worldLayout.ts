import { StructureDef } from '@glide/shared';

export const DEFAULT_WORLD: StructureDef[] = [
  {
    id: 'arena-wall-n',
    footprint: [
      { x: -1000, y: -1000 },
      { x: 1000, y: -1000 },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-s',
    footprint: [
      { x: -1000, y: 1000 },
      { x: 1000, y: 1000 },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-e',
    footprint: [
      { x: 1000, y: -1000 },
      { x: 1000, y: 1000 },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-w',
    footprint: [
      { x: -1000, y: -1000 },
      { x: -1000, y: 1000 },
    ],
    depth: 6,
  },
  {
    id: 'center-block',
    footprint: [
      { x: -75, y: -75 },
      { x: 75, y: -75 },
      { x: 75, y: 75 },
      { x: -75, y: 75 },
    ],
    depth: 4,
  },
];
