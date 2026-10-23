import { GUARDIANS } from "@dh/shared";
import type { GuardianId, SectorId } from "@dh/shared";
import type { Rng } from "@dh/utils";

export const SECTOR_BASE: Record<SectorId, number> = { 1: 4, 2: 8, 3: 12 };

export const roomBudget = (sector: SectorId, roomsClearedThisRun: number): number =>
  SECTOR_BASE[sector] + roomsClearedThisRun;

export interface WaveEntry {
  guardianId: GuardianId;
  elite: boolean;
  bleed: boolean;
}
export type Wave = WaveEntry[];

/** Spends the budget across 2 waves (3 at budget ≥ 10); at most one elite, which costs double. */
export function buildWaves(
  budget: number,
  pool: readonly { id: GuardianId; cost: number }[],
  rng: Rng,
  opts: { eliteChance?: number; bleed?: boolean } = {},
): Wave[] {
  const count = budget >= 10 ? 3 : 2;
  let eliteUsed = false;
  return Array.from({ length: count }, (_, i) => {
    // Even split; the remainder goes to the first waves, so no wave exceeds ceil(budget / count).
    let left = Math.floor(budget / count) + (i < budget % count ? 1 : 0);
    const wave: Wave = [];
    for (;;) {
      const affordable = pool.filter((p) => p.cost <= left);
      if (affordable.length === 0) break;
      const pick = rng.pick(affordable);
      const elite = !eliteUsed && pick.cost * 2 <= left && rng.chance(opts.eliteChance ?? 0.1);
      eliteUsed ||= elite;
      left -= pick.cost * (elite ? 2 : 1);
      // The Wraith is Bleed by nature; Bleed marks everyone else.
      wave.push({
        guardianId: pick.id,
        elite,
        bleed: (opts.bleed ?? false) && pick.id !== "bleed-wraith",
      });
    }
    return wave;
  });
}

/** Guardians this sector may spawn, limited to AIs that exist. */
export const encounterPool = (sector: SectorId, implementedAi: ReadonlySet<string>) =>
  Object.values(GUARDIANS)
    .filter((g) => g.sectorMin <= sector && implementedAi.has(g.ai))
    .map((g) => ({ id: g.id, cost: g.budgetCost }));
