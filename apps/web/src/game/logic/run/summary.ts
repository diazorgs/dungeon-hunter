import type { RunResult } from "@dh/shared";
import type { RunSummary } from "../../bridge/types.ts";
import type { RunState } from "./runState.ts";

export const toRunResult = (s: RunState): RunResult => ({
  runnerId: s.config.runnerId,
  seed: s.config.seed,
  sectorReached: s.sector,
  roomsCleared: s.roomsCleared,
  bossesKilled: s.bossesKilled,
  durationSec: Math.floor(s.activeMs / 1000),
  kills: s.kills,
  victory: s.outcome === "victory",
  logsFound: [...s.logsFound],
});

export const toRunSummary = (s: RunState): RunSummary => ({
  result: toRunResult(s),
  outcome: s.outcome === "running" ? "abandon" : s.outcome,
  scrapEarned: s.scrapEarned,
  newLogIds: s.logsFound.filter((id) => !s.config.collectedLogIds.includes(id)),
});
