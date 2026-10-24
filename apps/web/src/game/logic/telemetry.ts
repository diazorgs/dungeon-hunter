import type { SectorId, WeaponId } from "@dh/shared";
import type { RunSummary } from "../bridge/types.ts";

/** DEV-only local run log for the balance pass. Never sent anywhere. */
export const TELEMETRY_KEY = "dh.telemetry.dev";
const MAX_ENTRIES = 200;

export interface TelemetryEntry {
  at: number;
  outcome: RunSummary["outcome"];
  sectorReached: SectorId;
  roomsCleared: number;
  durationSec: number;
  deathRoomType?: string;
  deathCause?: string;
  weaponsUsed: WeaponId[];
}

type KV = Pick<Storage, "getItem" | "setItem">;

export function readTelemetry(storage: KV | null): TelemetryEntry[] {
  try {
    return JSON.parse(storage?.getItem(TELEMETRY_KEY) ?? "[]") as TelemetryEntry[];
  } catch {
    return [];
  }
}

export function recordRunTelemetry(
  summary: RunSummary,
  extra: { deathRoomType?: string; deathCause?: string; weaponsUsed: WeaponId[] },
  opts: { storage: KV | null; enabled?: boolean; now?: number },
): void {
  if (!(opts.enabled ?? !import.meta.env.PROD) || !opts.storage) return;
  const r = summary.result;
  const entry: TelemetryEntry = {
    at: opts.now ?? Date.now(),
    outcome: summary.outcome,
    sectorReached: r.sectorReached,
    roomsCleared: r.roomsCleared,
    durationSec: r.durationSec,
    ...extra,
  };
  const entries = [...readTelemetry(opts.storage), entry].slice(-MAX_ENTRIES);
  try {
    opts.storage.setItem(TELEMETRY_KEY, JSON.stringify(entries));
  } catch {
    // Full or blocked storage: telemetry is a nicety.
  }
}

export function summarizeTelemetry(entries: readonly TelemetryEntry[]) {
  const minutes = entries.map((e) => e.durationSec / 60).sort((a, b) => a - b);
  const mid = Math.floor(minutes.length / 2);
  const median =
    minutes.length === 0
      ? 0
      : minutes.length % 2
        ? minutes[mid]!
        : (minutes[mid - 1]! + minutes[mid]!) / 2;
  const deaths = entries.filter((e) => e.outcome === "death");
  const deathsBySector: Record<SectorId, number> = { 1: 0, 2: 0, 3: 0 };
  const where = new Map<string, number>();
  for (const d of deaths) {
    deathsBySector[d.sectorReached]++;
    const k = d.deathCause ?? d.deathRoomType;
    if (k) where.set(k, (where.get(k) ?? 0) + 1);
  }
  return {
    runs: entries.length,
    medianMinutes: median,
    winRate: entries.length
      ? entries.filter((e) => e.outcome === "victory").length / entries.length
      : 0,
    deathsBySector,
    deadliest: [...where]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k),
  };
}
