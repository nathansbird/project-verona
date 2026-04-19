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
  {
    id: 'city-nw-tower',
    footprint: [
      { x: -1250, y: -1250 },
      { x: -900, y: -1250 },
      { x: -900, y: -900 },
      { x: -1250, y: -900 },
    ],
    depth: 10,
  },
  {
    id: 'city-nw-block',
    footprint: [
      { x: -700, y: -1100 },
      { x: -450, y: -1100 },
      { x: -450, y: -850 },
      { x: -700, y: -850 },
    ],
    depth: 6,
  },
  {
    id: 'city-nw-long',
    footprint: [
      { x: -1250, y: -650 },
      { x: -800, y: -650 },
      { x: -800, y: -450 },
      { x: -1250, y: -450 },
    ],
    depth: 5,
  },
  {
    id: 'city-ne-block',
    footprint: [
      { x: 500, y: -1250 },
      { x: 900, y: -1250 },
      { x: 900, y: -900 },
      { x: 500, y: -900 },
    ],
    depth: 9,
  },
  {
    id: 'city-ne-spire',
    footprint: [
      { x: 1100, y: -1250 },
      { x: 1300, y: -1250 },
      { x: 1300, y: -700 },
      { x: 1100, y: -700 },
    ],
    depth: 12,
  },
  {
    id: 'city-ne-wide',
    footprint: [
      { x: 450, y: -700 },
      { x: 900, y: -700 },
      { x: 900, y: -450 },
      { x: 450, y: -450 },
    ],
    depth: 6,
  },
  {
    id: 'city-sw-tower',
    footprint: [
      { x: -1250, y: 900 },
      { x: -900, y: 900 },
      { x: -900, y: 1250 },
      { x: -1250, y: 1250 },
    ],
    depth: 10,
  },
  {
    id: 'city-sw-block',
    footprint: [
      { x: -700, y: 950 },
      { x: -450, y: 950 },
      { x: -450, y: 1200 },
      { x: -700, y: 1200 },
    ],
    depth: 7,
  },
  {
    id: 'city-sw-long',
    footprint: [
      { x: -1250, y: 500 },
      { x: -800, y: 500 },
      { x: -800, y: 700 },
      { x: -1250, y: 700 },
    ],
    depth: 5,
  },
  {
    id: 'city-se-block',
    footprint: [
      { x: 500, y: 500 },
      { x: 900, y: 500 },
      { x: 900, y: 900 },
      { x: 500, y: 900 },
    ],
    depth: 9,
  },
  {
    id: 'city-se-spire',
    footprint: [
      { x: 1100, y: 500 },
      { x: 1300, y: 500 },
      { x: 1300, y: 1100 },
      { x: 1100, y: 1100 },
    ],
    depth: 11,
  },
  {
    id: 'city-se-wide',
    footprint: [
      { x: 450, y: 1100 },
      { x: 900, y: 1100 },
      { x: 900, y: 1300 },
      { x: 450, y: 1300 },
    ],
    depth: 6,
  },
  {
    id: 'city-civic-hex',
    footprint: [
      { x: 150, y: -1100 },
      { x: 75, y: -970 },
      { x: -75, y: -970 },
      { x: -150, y: -1100 },
      { x: -75, y: -1230 },
      { x: 75, y: -1230 },
    ],
    depth: 8,
  },
  {
    id: 'city-civic-pent',
    footprint: [
      { x: 0, y: 950 },
      { x: 143, y: 1054 },
      { x: 88, y: 1221 },
      { x: -88, y: 1221 },
      { x: -143, y: 1054 },
    ],
    depth: 7,
  },
];
