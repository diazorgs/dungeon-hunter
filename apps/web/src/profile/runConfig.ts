import { availableRunners, MOD_IDS, WEAPON_IDS } from "@dh/shared";
import type { ModId, RunnerId, Settings, WeaponId } from "@dh/shared";
import { generateSeed } from "@dh/utils";
import type { RunConfig } from "../game/bridge/types.ts";
import type { Profile } from "./types.ts";

const isWeapon = (id: string): id is WeaponId => (WEAPON_IDS as readonly string[]).includes(id);
const isMod = (id: string): id is ModId => (MOD_IDS as readonly string[]).includes(id);

/** Profile + choices → the one object Phaser receives. A Runner no longer owned falls back to Vex. */
export function buildRunConfig(
  profile: Profile,
  runnerId: RunnerId,
  settings: Settings,
  seed: string = generateSeed(),
): RunConfig {
  const ids = (type: string) =>
    profile.unlocks.filter((u) => u.itemType === type).map((u) => u.itemId);
  return {
    runnerId: availableRunners(profile.unlocks).includes(runnerId) ? runnerId : "vex",
    seed,
    unlockedWeaponIds: ids("weapon").filter(isWeapon),
    unlockedModIds: ids("mod").filter(isMod),
    collectedLogIds: [...profile.vaultLogs],
    settings,
    firstRun: profile.stats.totalRuns === 0,
  };
}
