import type { BulletPool } from "../BulletPool.ts";

/** Anything a player weapon can damage: a guardian or a boss part. */
export interface HitTarget {
  id: number;
  x: number;
  y: number;
  radius: number;
  hit(dmg: number, knockback: number, angle: number, now: number, stunMs?: number): void;
}

/** What area/melee/beam/chain weapons need from the world. */
export interface CombatTargets {
  all(): HitTarget[];
  enemyBullets: BulletPool;
  blocked(x: number, y: number): boolean;
}
