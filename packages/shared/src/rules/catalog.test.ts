import { expect, test } from "vite-plus/test";
import { STARTER_WEAPON_POOL } from "../content.ts";
import { GuestImportSchema, RegisterSchema } from "../schemas/api.ts";
import { availableRunners, checkPurchase, dropPool } from "./catalog.ts";

const kit = { itemType: "runner", itemId: "kit" } as const;

test("checkPurchase: shards threshold", () => {
  expect(checkPurchase({ coreShards: 299, unlocks: [] }, kit)).toEqual({
    ok: false,
    code: "INSUFFICIENT_SHARDS",
  });
  expect(checkPurchase({ coreShards: 300, unlocks: [] }, kit)).toEqual({ ok: true, cost: 300 });
});
test("checkPurchase: already owned", () =>
  expect(checkPurchase({ coreShards: 999, unlocks: [kit] }, kit)).toEqual({
    ok: false,
    code: "ALREADY_OWNED",
  }));
test("starter weapon is not for sale", () =>
  expect(
    checkPurchase({ coreShards: 999, unlocks: [] }, { itemType: "weapon", itemId: "rust-pistol" }),
  ).toEqual({ ok: false, code: "UNKNOWN_ITEM" }));
test("dropPool([]) is the starter pool", () => expect(dropPool([])).toEqual(STARTER_WEAPON_POOL));
test("dropPool adds unlocked without duplicates", () =>
  expect(dropPool(["null-cannon", "rust-pistol"])).toHaveLength(STARTER_WEAPON_POOL.length + 1));
test("vex is always available; kit after unlock", () => {
  expect(availableRunners([])).toEqual(["vex"]);
  expect(availableRunners([kit])).toEqual(["vex", "kit"]);
});

const stats = { totalRuns: 0, totalVictories: 0, bestVictorySec: null };
test("guest import caps shards at 1000", () => {
  const ok = { coreShards: 1000, unlocks: [], vaultLogs: [], stats };
  expect(GuestImportSchema.parse({ ...ok, coreShards: 5000 }).coreShards).toBe(1000);
  expect(GuestImportSchema.safeParse({ ...ok, coreShards: -1 }).success).toBe(false);
});
test("register rejects bad usernames", () => {
  const ok = { email: "a@b.co", password: "12345678", username: "runner_047" };
  expect(RegisterSchema.safeParse(ok).success).toBe(true);
  expect(RegisterSchema.safeParse({ ...ok, username: "A!" }).success).toBe(false);
});
