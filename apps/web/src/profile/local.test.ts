import { DEFAULT_SETTINGS } from "@dh/shared";
import type { RunResult } from "@dh/shared";
import { expect, test } from "vite-plus/test";
import { LocalProfileRepository, memoryStorage, PROFILE_KEY } from "./local.ts";
import { migrateLocalProfile } from "./migrate.ts";
import { DEFAULT_PROFILE } from "./types.ts";

const run: RunResult = {
  runnerId: "vex",
  seed: "ABCD1234",
  sectorReached: 1,
  roomsCleared: 5,
  bossesKilled: 1,
  durationSec: 400,
  kills: 30,
  victory: false,
  logsFound: ["s1-log-1"],
};
const victory: RunResult = {
  ...run,
  sectorReached: 3,
  roomsCleared: 15,
  bossesKilled: 3,
  victory: true,
  durationSec: 1500,
  logsFound: [],
};

const fresh = () => {
  const storage = memoryStorage();
  return { storage, repo: new LocalProfileRepository(storage) };
};

test("load on empty or garbage storage returns defaults", async () => {
  const { storage, repo } = fresh();
  expect(await repo.load()).toEqual(DEFAULT_PROFILE);
  storage.setItem(PROFILE_KEY, "{not json");
  expect(await repo.load()).toEqual(DEFAULT_PROFILE);
});
test("legacy versions reset to defaults", () =>
  expect(migrateLocalProfile({ version: 0, shards: 50 })).toEqual(DEFAULT_PROFILE));

test("submitRun pays 5 rooms + Gatekeeper and stores new logs", async () => {
  const { repo } = fresh();
  const r = await repo.submitRun(run);
  expect(r.shardsAwarded).toBe(35);
  expect(r.newLogIds).toEqual(["s1-log-1"]);
  expect(r.profile.stats.totalRuns).toBe(1);
  const again = await repo.submitRun({ ...run, seed: "ABCD1235" });
  expect(again.newLogIds).toEqual([]);
  expect((await repo.load()).coreShards).toBe(70);
});
test("a rejected run pays nothing but still counts", async () => {
  const { repo } = fresh();
  const r = await repo.submitRun({ ...run, roomsCleared: 18 });
  expect(r).toMatchObject({ shardsAwarded: 0, rejected: "ROOMS_EXCEED_SECTOR" });
  expect(r.profile.stats.totalRuns).toBe(1);
  expect(r.profile.coreShards).toBe(0);
});
test("victory tracks the best time only when faster", async () => {
  const { repo } = fresh();
  await repo.submitRun(victory);
  await repo.submitRun({ ...victory, durationSec: 2000 });
  const p = (await repo.submitRun({ ...victory, durationSec: 1200 })).profile;
  expect(p.stats).toEqual({ totalRuns: 3, totalVictories: 3, bestVictorySec: 1200 });
});

test("purchase checks shards and ownership", async () => {
  const { storage, repo } = fresh();
  const kit = { itemType: "runner", itemId: "kit" } as const;
  storage.setItem(PROFILE_KEY, JSON.stringify({ ...DEFAULT_PROFILE, coreShards: 299 }));
  await expect(repo.purchase(kit)).rejects.toMatchObject({ code: "INSUFFICIENT_SHARDS" });
  storage.setItem(PROFILE_KEY, JSON.stringify({ ...DEFAULT_PROFILE, coreShards: 300 }));
  const p = await repo.purchase(kit);
  expect(p.coreShards).toBe(0);
  expect(p.unlocks).toEqual([kit]);
  await expect(repo.purchase(kit)).rejects.toMatchObject({ code: "ALREADY_OWNED" });
});
test("writes re-read storage, so another tab's change survives", async () => {
  const { storage, repo } = fresh();
  await repo.load();
  storage.setItem(PROFILE_KEY, JSON.stringify({ ...DEFAULT_PROFILE, coreShards: 80 }));
  expect((await repo.markSeen("intro")).coreShards).toBe(80);
});
test("null storage works in memory", async () => {
  const repo = new LocalProfileRepository(null);
  await repo.submitRun(run);
  expect((await repo.load()).coreShards).toBe(35);
  await repo.saveSettings({ ...DEFAULT_SETTINGS, sfxVolume: 0 });
  expect((await repo.loadSettings()).sfxVolume).toBe(0);
});
