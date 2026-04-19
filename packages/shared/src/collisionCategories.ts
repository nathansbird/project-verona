export const Category = {
  SHIP: 0x0001,
  PROJECTILE: 0x0002,
  STRUCTURE: 0x0004,
  SHIELD: 0x0008,
} as const;

export const Mask = {
  SHIP: Category.STRUCTURE | Category.SHIP | Category.PROJECTILE | Category.SHIELD,
  PROJECTILE: Category.STRUCTURE | Category.SHIP | Category.SHIELD,
  STRUCTURE: Category.SHIP | Category.PROJECTILE,
  SHIELD: Category.PROJECTILE,
} as const;
