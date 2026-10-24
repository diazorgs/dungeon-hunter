import { DEFAULT_SETTINGS, validateRun } from "@dh/shared";
import { expect, test } from "vite-plus/test";
import type { RunConfig } from "../../bridge/types.ts";
import * as R from "./runState.ts";
import { toRunResult, toRunSummary } from "./summary.ts";

const config: RunConfig = {
  runnerId: "vex",
  seed: "ABCD1234",
  unlockedWeaponIds: [],
  unlockedModIds: [],
  collectedLogIds: ["s1-log-1"],
  settings: DEFAULT_SETTINGS,
  firstRun: false,
};

test("paused time does not accumulate", () => {
  const s = R.createRunState(config);
  R.tickTime(s, 600_000, true);
  R.tickTime(s, 1500, false);
  expect(toRunResult(s).durationSec).toBe(1);
});
test("5 rooms + gatekeeper in sector 1", () => {
  const s = R.createRunState(config);
  for (let i = 0; i < 5; i++) R.onRoomCleared(s);
  R.onBossKilled(s, "gatekeeper");
  expect(toRunResult(s)).toMatchObject({ sectorReached: 1, roomsCleared: 5, bossesKilled: 1 });
  R.advanceSector(s);
  expect(toRunResult(s).sectorReached).toBe(2);
});
test("warden kill is a victory", () => {
  const s = R.createRunState(config);
  R.advanceSector(s);
  R.advanceSector(s);
  for (const b of ["gatekeeper", "conduit-hydra", "core-warden"] as const) R.onBossKilled(s, b);
  expect(toRunResult(s)).toMatchObject({ victory: true, bossesKilled: 3 });
  expect(() => R.advanceSector(s)).toThrow();
});
test("immediate abandon is a valid run", () => {
  const s = R.createRunState(config);
  R.endRun(s, "abandon");
  expect(validateRun(toRunResult(s))).toEqual({ ok: true });
});
test("first ending wins", () => {
  const s = R.createRunState(config);
  R.endRun(s, "death");
  R.endRun(s, "abandon");
  expect(s.outcome).toBe("death");
});
test("newLogIds excludes logs already collected", () => {
  const s = R.createRunState(config);
  R.addLog(s, "s1-log-1");
  R.addLog(s, "s1-log-2");
  expect(R.addLog(s, "s1-log-2")).toBe(false);
  expect(toRunSummary(s).newLogIds).toEqual(["s1-log-2"]);
});
test("spendScrap is all-or-nothing", () => {
  const s = R.createRunState(config);
  R.addScrap(s, 5);
  expect(R.spendScrap(s, 6)).toBe(false);
  expect(R.spendScrap(s, 5)).toBe(true);
  expect([s.scrap, s.scrapEarned]).toEqual([0, 5]);
});

test("a run through all three sectors reports sectorReached 3", () => {
  const s = R.createRunState(config);
  R.advanceSector(s);
  R.advanceSector(s);
  expect(toRunResult(s).sectorReached).toBe(3);
});
