import type { MeResponse, RunResult } from "@dh/shared";
import { expect, test } from "vite-plus/test";
import { weekStartUtc } from "../db/memoryRepo.ts";
import { setup } from "../test/helpers.ts";

const run5: RunResult = {
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
const victory = (durationSec: number): RunResult => ({
  ...run5,
  sectorReached: 3,
  roomsCleared: 15,
  bossesKilled: 3,
  victory: true,
  durationSec,
  logsFound: [],
});
type Json = { error?: { code: string } } & Record<string, unknown>;
const json = async (r: Response) => (await r.json()) as Json;
const MINUTE = 61_000;

const authed = async (name = "runner_47") => {
  const s = setup();
  await s.register(name);
  return s;
};

test("GET /me returns a zeroed profile for a new account", async () => {
  const a = await authed();
  const me = (await json(await a.get("/api/me"))) as unknown as MeResponse;
  expect(me.profile.coreShards).toBe(0);
  expect(me.unlocks).toEqual([]);
  expect(me.stats).toEqual({ totalRuns: 0, totalVictories: 0, bestVictorySec: null });
  expect(me.settings.damageNumbers).toBe(false);
});
test("GET /me without a session → 401", async () =>
  expect((await setup().get("/api/me")).status).toBe(401));

test("valid run pays server-computed shards; client shard fields are ignored", async () => {
  const a = await authed();
  const res = await a.post("/api/runs", { ...run5, shardsAwarded: 9999 });
  expect(res.status).toBe(200);
  const body = await json(res);
  expect(body.shardsAwarded).toBe(35);
  expect(body.newLogIds).toEqual(["s1-log-1"]);
  expect((body.me as MeResponse).profile.coreShards).toBe(35);
});

test.each([
  [{ roomsCleared: 18 }, "ROOMS_EXCEED_SECTOR"],
  [{ roomsCleared: 5, durationSec: 20 }, "TOO_FAST_PER_ROOM"],
  [{ ...victory(300) }, "VICTORY_TOO_FAST"],
])("forged run %o → 422 %s, nothing stored", async (patch, reason) => {
  const a = await authed();
  const res = await a.post("/api/runs", { ...run5, ...patch });
  expect(res.status).toBe(422);
  expect((await json(res)).error?.code).toBe(`RUN_REJECTED:${reason}`);
  const me = (await json(await a.get("/api/me"))) as unknown as MeResponse;
  expect(me.stats.totalRuns).toBe(0);
  expect(me.profile.coreShards).toBe(0);
});

test("second run within 60 s → 429 and the profile is unchanged", async () => {
  const a = await authed();
  await a.post("/api/runs", run5);
  const res = await a.post("/api/runs", { ...run5, seed: "ABCD1235" });
  expect(res.status).toBe(429);
  expect((await json(res)).error?.code).toBe("RATE_LIMITED");
  const me = (await json(await a.get("/api/me"))) as unknown as MeResponse;
  expect(me.profile.coreShards).toBe(35);
  a.repo.clock.now += MINUTE;
  expect((await a.post("/api/runs", run5)).status).toBe(200);
});

test("purchase kit at 299 → 409; at 300 → unlocked, balance 0; again → ALREADY_OWNED", async () => {
  const a = await authed();
  const [userId] = [...a.repo._profiles.keys()];
  const kit = { itemType: "runner", itemId: "kit" };
  a.repo._profiles.get(userId!)!.coreShards = 299;
  const poor = await a.post("/api/armory/purchase", kit);
  expect(poor.status).toBe(409);
  expect((await json(poor)).error?.code).toBe("INSUFFICIENT_SHARDS");
  a.repo._profiles.get(userId!)!.coreShards = 300;
  const ok = (await json(await a.post("/api/armory/purchase", kit))) as unknown as MeResponse;
  expect(ok.profile.coreShards).toBe(0);
  expect(ok.unlocks).toEqual([kit]);
  expect((await json(await a.post("/api/armory/purchase", kit))).error?.code).toBe("ALREADY_OWNED");
});
test("purchase of a starter weapon → 404 UNKNOWN_ITEM", async () => {
  const a = await authed();
  const res = await a.post("/api/armory/purchase", { itemType: "weapon", itemId: "rust-pistol" });
  expect(res.status).toBe(404);
});

test("leaderboard: empty → []; fastest lists victories only, one per profile", async () => {
  const a = await authed("alice");
  expect(await json(await a.get("/api/leaderboard?period=all&kind=fastest"))).toEqual({
    entries: [],
  });
  await a.post("/api/runs", victory(1500));
  a.repo.clock.now += MINUTE;
  await a.post("/api/runs", victory(1200));
  a.repo.clock.now += MINUTE;
  await a.post("/api/runs", run5);
  const body = await json(await a.get("/api/leaderboard?period=all&kind=fastest"));
  expect(body.entries).toMatchObject([{ rank: 1, username: "alice", durationSec: 1200 }]);
  const deepest = await json(await a.get("/api/leaderboard?period=all&kind=deepest"));
  expect(deepest.entries).toMatchObject([
    { username: "alice", sectorReached: 3, durationSec: 1200 },
  ]);
});
test("weekly excludes runs before Monday 00:00 UTC", async () => {
  const a = await authed("alice");
  const monday = weekStartUtc(Date.UTC(2026, 9, 21)); // a Wednesday → Mon 19 Oct
  expect(new Date(monday).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  a.repo.clock.now = monday - 1000;
  await a.post("/api/runs", victory(1500));
  a.repo.clock.now = monday + 3 * 86_400_000;
  expect((await json(await a.get("/api/leaderboard?period=weekly&kind=fastest"))).entries).toEqual(
    [],
  );
  expect(
    (await json(await a.get("/api/leaderboard?period=all&kind=fastest"))).entries,
  ).toHaveLength(1);
});
test("leaderboard rejects unknown query values", async () =>
  expect((await setup().get("/api/leaderboard?period=year&kind=fastest")).status).toBe(400));

test("PUT /me/settings persists and GET /me returns it", async () => {
  const a = await authed();
  const s = {
    version: 1,
    musicVolume: 0,
    sfxVolume: 0.5,
    screenShake: 0,
    damageNumbers: true,
  };
  expect((await a.put("/api/me/settings", s)).status).toBe(204);
  expect(((await json(await a.get("/api/me"))) as unknown as MeResponse).settings).toEqual(s);
});

const guest = {
  coreShards: 5000,
  unlocks: [
    { itemType: "runner", itemId: "kit" },
    { itemType: "weapon", itemId: "made-up-gun" },
  ],
  vaultLogs: ["s1-log-2", "not-a-log"],
  stats: { totalRuns: 7, totalVictories: 1, bestVictorySec: 1400 },
};
test("guest import caps shards, drops unknown ids, keeps max stats; second import → 409", async () => {
  const a = await authed();
  await a.post("/api/runs", run5);
  const res = await a.post("/api/me/import", guest);
  expect(res.status).toBe(200);
  const me = (await json(res)) as unknown as MeResponse;
  expect(me.profile.coreShards).toBe(35 + 1000);
  expect(me.unlocks).toEqual([{ itemType: "runner", itemId: "kit" }]);
  expect([...me.vaultLogs].sort()).toEqual(["s1-log-1", "s1-log-2"]);
  expect(me.stats).toEqual({ totalRuns: 7, totalVictories: 1, bestVictorySec: 1400 });
  const again = await a.post("/api/me/import", guest);
  expect(again.status).toBe(409);
  expect((await json(again)).error?.code).toBe("IMPORT_USED");
});
