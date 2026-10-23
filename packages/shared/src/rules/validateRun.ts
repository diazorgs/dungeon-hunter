import { LOGS } from "../content.ts";
import type { RunResult } from "../schemas/run.ts";
import { MAX_COMBAT_ROOMS_PER_SECTOR, MIN_SEC_PER_ROOM, MIN_VICTORY_SEC } from "./payout.ts";

export type RunRejectReason =
  | "ROOMS_EXCEED_SECTOR"
  | "BOSSES_EXCEED_SECTOR"
  | "VICTORY_INCONSISTENT"
  | "TOO_FAST_PER_ROOM"
  | "VICTORY_TOO_FAST"
  | "UNKNOWN_LOG"
  | "DUPLICATE_LOG";

export function validateRun(run: RunResult): { ok: true } | { ok: false; reason: RunRejectReason } {
  const reject = (reason: RunRejectReason) => ({ ok: false as const, reason });
  if (run.roomsCleared > MAX_COMBAT_ROOMS_PER_SECTOR * run.sectorReached)
    return reject("ROOMS_EXCEED_SECTOR");
  if (run.bossesKilled > run.sectorReached) return reject("BOSSES_EXCEED_SECTOR");
  // Victory is derived from the Warden kill: one without the other is forged.
  const wardenKilled = run.sectorReached === 3 && run.bossesKilled === 3;
  if (run.victory !== wardenKilled) return reject("VICTORY_INCONSISTENT");
  if (run.durationSec < MIN_SEC_PER_ROOM * run.roomsCleared) return reject("TOO_FAST_PER_ROOM");
  if (run.victory && run.durationSec < MIN_VICTORY_SEC) return reject("VICTORY_TOO_FAST");
  for (const id of run.logsFound) {
    const log = (LOGS as Record<string, (typeof LOGS)[keyof typeof LOGS] | undefined>)[id];
    if (!log || log.sector > run.sectorReached) return reject("UNKNOWN_LOG");
  }
  if (new Set(run.logsFound).size !== run.logsFound.length) return reject("DUPLICATE_LOG");
  return { ok: true };
}
