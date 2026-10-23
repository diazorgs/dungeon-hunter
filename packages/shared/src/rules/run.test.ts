import { expect, test } from "vite-plus/test";
import type { RunResult } from "../schemas/run.ts";
import { computeShardPayout } from "./payout.ts";
import { validateRun } from "./validateRun.ts";

const base: RunResult = {
  runnerId: "vex",
  seed: "ABCD1234",
  sectorReached: 1,
  roomsCleared: 0,
  bossesKilled: 0,
  durationSec: 0,
  kills: 0,
  victory: false,
  logsFound: [],
};

test("instant sector-1 death is valid and pays 0", () => {
  expect(validateRun(base)).toEqual({ ok: true });
  expect(computeShardPayout(base)).toBe(0);
});
test("payout: 5 rooms + gatekeeper", () =>
  expect(computeShardPayout({ ...base, roomsCleared: 5, bossesKilled: 1, durationSec: 400 })).toBe(
    35,
  ));
test("payout: full victory", () =>
  expect(
    computeShardPayout({
      ...base,
      sectorReached: 3,
      roomsCleared: 15,
      bossesKilled: 3,
      victory: true,
      durationSec: 1500,
    }),
  ).toBe(180));
test("payout never exceeds MAX_SHARDS_PER_RUN", () =>
  expect(
    computeShardPayout({
      ...base,
      sectorReached: 3,
      roomsCleared: 18,
      bossesKilled: 3,
      victory: true,
      durationSec: 2000,
    }),
  ).toBe(186));
test("valid full victory passes", () =>
  expect(
    validateRun({
      ...base,
      sectorReached: 3,
      roomsCleared: 15,
      bossesKilled: 3,
      victory: true,
      durationSec: 1500,
      logsFound: ["s1-log-1", "s3-log-2"],
    }),
  ).toEqual({ ok: true }));
test.each([
  [{ roomsCleared: 7 }, "ROOMS_EXCEED_SECTOR"],
  [{ bossesKilled: 2 }, "BOSSES_EXCEED_SECTOR"],
  [{ roomsCleared: 3, durationSec: 23 }, "TOO_FAST_PER_ROOM"],
  [
    { sectorReached: 3, roomsCleared: 12, bossesKilled: 3, victory: true, durationSec: 359 },
    "VICTORY_TOO_FAST",
  ],
  [{ victory: true }, "VICTORY_INCONSISTENT"],
  [
    { sectorReached: 3, roomsCleared: 12, bossesKilled: 3, victory: false, durationSec: 900 },
    "VICTORY_INCONSISTENT",
  ],
  [{ logsFound: ["s2-log-1"] }, "UNKNOWN_LOG"],
  [{ logsFound: ["nope"] }, "UNKNOWN_LOG"],
  [{ logsFound: ["s1-log-1", "s1-log-1"] }, "DUPLICATE_LOG"],
])("rejects %o as %s", (patch, reason) =>
  expect(validateRun({ ...base, ...patch } as RunResult)).toEqual({ ok: false, reason }),
);
