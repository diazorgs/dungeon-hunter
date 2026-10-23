import { MODS } from "@dh/shared";
import type { ModId } from "@dh/shared";
import type { PlayerStats } from "../combat/stats.ts";

/** Field Patch: heal on sector-boss death, summed over copies. */
export const onBossKilledEffects = (stats: PlayerStats): { heal: number } => ({
  heal: stats.hooks.onBossKilled.reduce((sum, h) => sum + h.value, 0),
});

/** Thorn Plating: 1 contact damage per copy (stats.flags cannot count copies, so this reads the mod list). */
export const thornDamage = (mods: readonly ModId[]): number =>
  mods.filter((id) => MODS[id].effects.some((e) => e.kind === "flag" && e.flag === "thornContact"))
    .length;
