export interface EnemyHealth {
  hp: number;
  maxHp: number;
  dead: boolean;
  stunnedUntil: number;
}

export function createEnemyHealth(hp: number, hpMul = 1): EnemyHealth {
  const max = Math.max(1, Math.round(hp * hpMul));
  return { hp: max, maxHp: max, dead: false, stunnedUntil: -Infinity };
}

export function damageEnemy(e: EnemyHealth, amount: number): { dealt: number; killed: boolean } {
  if (e.dead || amount <= 0) return { dealt: 0, killed: false };
  const dealt = Math.min(e.hp, amount);
  e.hp -= dealt;
  if (e.hp <= 0) e.dead = true;
  return { dealt, killed: e.dead };
}

export function stun(e: EnemyHealth, now: number, ms: number): void {
  e.stunnedUntil = Math.max(e.stunnedUntil, now + ms);
}

export const isStunned = (e: EnemyHealth, now: number): boolean => now < e.stunnedUntil;
