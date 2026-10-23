import { MODS } from "@dh/shared";
import type { ModId } from "@dh/shared";
import type { Rng } from "@dh/utils";
import type { PlayerStats } from "../combat/stats.ts";

const maxHpDelta = (id: ModId) =>
  MODS[id].effects.reduce(
    (sum, e) => sum + (e.kind === "stat" && e.stat === "maxHp" ? e.value : 0),
    0,
  );

/** Up to `n` distinct mods from the pool, never one that would push max HP below 1. */
export function rollModChoices(
  rng: Rng,
  pool: readonly ModId[],
  stats: PlayerStats,
  n = 3,
): ModId[] {
  const eligible = [...new Set(pool)].filter((id) => stats.maxHp + maxHpDelta(id) >= 1);
  return rng.shuffle(eligible).slice(0, n);
}
