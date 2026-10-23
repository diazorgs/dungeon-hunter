import type { Mod, ModEffect, Runner } from "@dh/shared";
import type { CombatantState } from "./combatant.ts";

type StatName = Extract<ModEffect, { kind: "stat" }>["stat"];
type Flag = Extract<ModEffect, { kind: "flag" }>["flag"];

export interface PlayerStats {
  maxHp: number;
  maxShield: number;
  maxEnergy: number;
  fireRateMul: number;
  damageMul: number;
  pickupRadiusMul: number;
  dashCharges: number;
  chestLuck: number;
  flags: ReadonlySet<Flag>;
  hooks: { onBossKilled: { action: "heal"; value: number }[] };
}

export function deriveStats(runner: Runner, mods: readonly Mod[]): PlayerStats {
  const n: Record<StatName, number> = {
    maxHp: runner.hp,
    maxShield: runner.shield,
    maxEnergy: runner.energy,
    fireRateMul: 1,
    damageMul: 1,
    pickupRadiusMul: 1,
    dashCharges: 1,
    chestLuck: 0,
  };
  const flags = new Set<Flag>();
  const onBossKilled: PlayerStats["hooks"]["onBossKilled"] = [];
  for (const e of mods.flatMap((m) => m.effects)) {
    if (e.kind === "stat") {
      // DESIGN.md §6.2: multipliers multiply, flat values add.
      n[e.stat] = e.stat.endsWith("Mul") ? n[e.stat] * e.value : n[e.stat] + e.value;
    } else if (e.kind === "flag") flags.add(e.flag);
    else onBossKilled.push({ action: e.action, value: e.value });
  }
  return {
    ...n,
    maxHp: Math.max(1, n.maxHp),
    maxShield: Math.max(0, n.maxShield),
    maxEnergy: Math.max(0, n.maxEnergy),
    dashCharges: Math.max(1, n.dashCharges),
    flags,
    hooks: { onBossKilled },
  };
}

/** Raises current resources by any max increase, then clamps to the new max. */
export function applyStatChange(s: CombatantState, before: PlayerStats, after: PlayerStats): void {
  const adjust = (cur: number, oldMax: number, newMax: number) =>
    Math.min(newMax, cur + Math.max(0, newMax - oldMax));
  s.hp = adjust(s.hp, before.maxHp, after.maxHp);
  s.shield = adjust(s.shield, before.maxShield, after.maxShield);
  s.energy = adjust(s.energy, before.maxEnergy, after.maxEnergy);
  s.maxHp = after.maxHp;
  s.maxShield = after.maxShield;
  s.maxEnergy = after.maxEnergy;
  if (!s.dead) s.hp = Math.max(1, s.hp);
}
