import type { PlayerStats } from "./stats.ts";

export type BuffId = "overcharge";

export interface ActiveBuffs {
  until: Partial<Record<BuffId, number>>;
}

/** Re-adding refreshes the end time; buffs never stack. */
export function addBuff(b: ActiveBuffs, id: BuffId, now: number, ms: number): void {
  b.until[id] = now + ms;
}

export const isActive = (b: ActiveBuffs, id: BuffId, now: number): boolean =>
  now < (b.until[id] ?? -Infinity);

export const effectiveFireRateMul = (stats: PlayerStats, b: ActiveBuffs, now: number): number =>
  stats.fireRateMul * (isActive(b, "overcharge", now) ? 2 : 1);

export const effectiveEnergyCost = (baseCost: number, b: ActiveBuffs, now: number): number =>
  isActive(b, "overcharge", now) ? 0 : baseCost;
