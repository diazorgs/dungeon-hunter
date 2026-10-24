import { DEFAULT_SETTINGS } from "@dh/shared";
import type { MeResponse, RunResult } from "@dh/shared";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { createApiClient } from "../lib/api.ts";
import { ApiProfileRepository } from "./api.ts";
import { LocalProfileRepository, memoryStorage } from "./local.ts";
import { savePendingRun } from "./pendingRun.ts";

const me: MeResponse = {
  profile: { id: "u1", username: "runner_47", coreShards: 35 },
  unlocks: [{ itemType: "runner", itemId: "kit" }],
  vaultLogs: ["s1-log-1"],
  stats: { totalRuns: 2, totalVictories: 0, bestVictorySec: null },
  settings: DEFAULT_SETTINGS,
};
const run: RunResult = {
  runnerId: "vex",
  seed: "ABCD1234",
  sectorReached: 1,
  roomsCleared: 5,
  bossesKilled: 1,
  durationSec: 400,
  kills: 1,
  victory: false,
  logsFound: [],
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("location", { origin: "http://localhost:5173" });
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

const repoWith = (handler: (url: string, init?: RequestInit) => Response) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input instanceof Request ? input.url : input), init),
  );
  const repo = new ApiProfileRepository(
    createApiClient(fetchMock as unknown as typeof fetch),
    new LocalProfileRepository(memoryStorage()),
  );
  return { repo, fetchMock };
};

test("load maps MeResponse to Profile with per-device flags", async () => {
  const { repo } = repoWith(() => reply(200, me));
  expect(await repo.load()).toEqual({
    version: 1,
    username: "runner_47",
    coreShards: 35,
    unlocks: me.unlocks,
    vaultLogs: ["s1-log-1"],
    stats: me.stats,
    seenIntro: false,
    seenEnding: false,
  });
});
test("a 422 from submitRun becomes ProfileError with the server code and clears the pending run", async () => {
  const { repo } = repoWith(() =>
    reply(422, { error: { code: "RUN_REJECTED:TOO_FAST_PER_ROOM", message: "x" } }),
  );
  await expect(repo.submitRun(run)).rejects.toMatchObject({
    code: "RUN_REJECTED:TOO_FAST_PER_ROOM",
  });
  expect(store.size).toBe(0);
});
test("a 401 keeps the run pending; it is replayed once after login", async () => {
  let authed = false;
  let runCalls = 0;
  const { repo } = repoWith((url) =>
    url.endsWith("/api/runs") && ++runCalls
      ? authed
        ? reply(200, { shardsAwarded: 35, newLogIds: [], me })
        : reply(401, { error: { code: "UNAUTHORIZED", message: "x" } })
      : reply(200, me),
  );
  await expect(repo.submitRun(run)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(store.size).toBe(1);
  authed = true;
  expect((await repo.replayPendingRun())?.shardsAwarded).toBe(35);
  expect(await repo.replayPendingRun()).toBeNull();
  expect(runCalls).toBe(2);
});
test("savePendingRun survives across repository instances", () => {
  savePendingRun(run);
  expect(JSON.parse(store.values().next().value!)).toEqual(run);
});
