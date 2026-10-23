import type { RunConfig, RunSummary } from "../bridge/types.ts";

/** Summary for a run that ends before any progress tracking exists (plan 12 replaces this). */
export function emptyRunSummary(
  config: RunConfig,
  elapsedMs: number,
  outcome: RunSummary["outcome"],
): RunSummary {
  return {
    result: {
      runnerId: config.runnerId,
      seed: config.seed,
      sectorReached: 1,
      roomsCleared: 0,
      bossesKilled: 0,
      durationSec: Math.floor(elapsedMs / 1000),
      kills: 0,
      victory: false,
      logsFound: [],
    },
    outcome,
    scrapEarned: 0,
    newLogIds: [],
  };
}
