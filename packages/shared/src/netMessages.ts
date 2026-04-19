export interface ProjectileSpawnEvent {
  id: string;
  ownerSessionId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnTick: number;
  despawnTick: number;
}

export interface ProjectileHitEvent {
  id: string;
  x: number;
  y: number;
  victimSessionId: string;
  ownerSessionId: string;
}

export interface ProjectileCancelEvent {
  id: string;
}

export interface InputAckMessage {
  lastSeq: number;
}

export const PROJECTILE_SPAWN = 'pSpawn';
export const PROJECTILE_HIT = 'pHit';
export const PROJECTILE_CANCEL = 'pCancel';
export const INPUT_ACK = 'inputAck';
