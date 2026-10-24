import { expect, test } from "vite-plus/test";
import type { RunSummary } from "../bridge/types.ts";
import { readTelemetry, recordRunTelemetry, summarizeTelemetry } from "./telemetry.ts";
import type { TelemetryEntry } from "./telemetry.ts";

const e = (p: Partial<TelemetryEntry>): TelemetryEntry => ({
  at: 0,
  outcome: "death",
  sectorReached: 1,
  roomsCleared: 3,
  durationSec: 600,
  weaponsUsed: [],
  ...p,
});

test("summary: median, win rate, deaths per sector, deadliest rooms", () => {
  const s = summarizeTelemetry([
    e({ durationSec: 600, deathRoomType: "boss" }),
    e({ durationSec: 1200, sectorReached: 2, deathRoomType: "combat" }),
    e({ durationSec: 1800, sectorReached: 2, deathRoomType: "boss" }),
    e({ durationSec: 2400, outcome: "victory", sectorReached: 3 }),
  ]);
  expect(s.medianMinutes).toBe(25);
  expect(s.winRate).toBe(0.25);
  expect(s.deathsBySector).toEqual({ 1: 1, 2: 2, 3: 0 });
  expect(s.deadliest).toEqual(["boss", "combat"]);
});
test("empty log summarises to zeros", () =>
  expect(summarizeTelemetry([])).toMatchObject({ runs: 0, medianMinutes: 0, winRate: 0 }));

const summary: RunSummary = {
  outcome: "death",
  scrapEarned: 0,
  newLogIds: [],
  result: {
    runnerId: "vex",
    seed: "ABCD1234",
    sectorReached: 1,
    roomsCleared: 2,
    bossesKilled: 0,
    durationSec: 100,
    kills: 4,
    victory: false,
    logsFound: [],
  },
};
const mem = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

test("recording is a no-op in production builds", () => {
  const storage = mem();
  recordRunTelemetry(summary, { weaponsUsed: [] }, { storage, enabled: false });
  expect(readTelemetry(storage)).toEqual([]);
});
test("recording keeps the last 200 entries", () => {
  const storage = mem();
  for (let i = 0; i < 205; i++)
    recordRunTelemetry(
      summary,
      { weaponsUsed: ["rust-pistol"] },
      { storage, enabled: true, now: i },
    );
  const log = readTelemetry(storage);
  expect(log).toHaveLength(200);
  expect(log[0]!.at).toBe(5);
});
