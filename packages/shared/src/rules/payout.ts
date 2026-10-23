import type { RunResult } from "../schemas/run.ts";

export const MAX_COMBAT_ROOMS_PER_SECTOR = 6;
export const MIN_SEC_PER_ROOM = 8;
export const MIN_VICTORY_SEC = 360;
// 2 × 18 rooms + 25 × 2 sector bosses + 100 victory.
export const MAX_SHARDS_PER_RUN = 186;

export function computeShardPayout(run: RunResult): number {
  const shards =
    2 * run.roomsCleared + 25 * Math.min(run.bossesKilled, 2) + (run.victory ? 100 : 0);
  return Math.min(MAX_SHARDS_PER_RUN, shards);
}
