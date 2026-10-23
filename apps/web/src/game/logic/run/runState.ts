import type { BossId, LogId, ModId, SectorId } from "@dh/shared";
import type { RunConfig } from "../../bridge/types.ts";

export interface RunState {
  config: RunConfig;
  sector: SectorId;
  /** Combat rooms only (DESIGN.md D4). */
  roomsCleared: number;
  bossesKilled: number;
  kills: number;
  scrap: number;
  scrapEarned: number;
  mods: ModId[];
  logsFound: LogId[];
  /** Unpaused play time; the anti-cheat minimums depend on it being honest. */
  activeMs: number;
  outcome: "running" | "victory" | "death" | "abandon";
}

export const createRunState = (config: RunConfig): RunState => ({
  config,
  sector: 1,
  roomsCleared: 0,
  bossesKilled: 0,
  kills: 0,
  scrap: 0,
  scrapEarned: 0,
  mods: [],
  logsFound: [],
  activeMs: 0,
  outcome: "running",
});

export function tickTime(s: RunState, dtMs: number, paused: boolean): void {
  if (!paused && s.outcome === "running") s.activeMs += dtMs;
}

export function onRoomCleared(s: RunState): void {
  s.roomsCleared++;
}

export function onKill(s: RunState): void {
  s.kills++;
}

export function onBossKilled(s: RunState, boss: BossId): void {
  if (s.outcome !== "running") return;
  s.bossesKilled++;
  if (boss === "core-warden") s.outcome = "victory";
}

export function addScrap(s: RunState, n: number): void {
  s.scrap += n;
  s.scrapEarned += n;
}

/** All-or-nothing. */
export function spendScrap(s: RunState, n: number): boolean {
  if (s.scrap < n) return false;
  s.scrap -= n;
  return true;
}

export function addMod(s: RunState, id: ModId): void {
  s.mods.push(id);
}

/** False when already found this run. */
export function addLog(s: RunState, id: LogId): boolean {
  if (s.logsFound.includes(id)) return false;
  s.logsFound.push(id);
  return true;
}

export function advanceSector(s: RunState): void {
  if (s.sector === 3) throw new Error("advanceSector: already in sector 3");
  s.sector = (s.sector + 1) as SectorId;
}

/** First ending wins: dying during a boss death sequence is still a death. */
export function endRun(s: RunState, outcome: "death" | "abandon"): void {
  if (s.outcome === "running") s.outcome = outcome;
}
