import { createRng } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { buildWaves, encounterPool, roomBudget } from "./budget.ts";

const pool = [
  { id: "crawler" as const, cost: 1 },
  { id: "sentry-drone" as const, cost: 1 },
  { id: "turret-node" as const, cost: 2 },
];
const rng = () => createRng("waves");
const cost = (w: { guardianId: string; elite: boolean }[]) =>
  w.reduce((s, e) => s + pool.find((p) => p.id === e.guardianId)!.cost * (e.elite ? 2 : 1), 0);

test("budget grows with rooms cleared", () =>
  expect([roomBudget(1, 0), roomBudget(1, 3), roomBudget(3, 10)]).toEqual([4, 7, 22]));
test("two waves below 10, three at 10+", () => {
  expect(buildWaves(9, pool, rng())).toHaveLength(2);
  expect(buildWaves(10, pool, rng())).toHaveLength(3);
});
test("wave spend never exceeds its share", () => {
  for (const b of [4, 7, 9, 10, 13, 22])
    for (const w of buildWaves(b, pool, rng()))
      expect(cost(w)).toBeLessThanOrEqual(Math.ceil(b / (b >= 10 ? 3 : 2)));
});
test("leftover below the cheapest cost terminates", () =>
  expect(buildWaves(1, [{ id: "shield-bot", cost: 3 }], rng())).toEqual([[], []]));
test("at most one elite", () => {
  const all = buildWaves(12, pool, rng(), { eliteChance: 1 }).flat();
  expect(all.filter((e) => e.elite)).toHaveLength(1);
});
test("pool respects sectorMin and implemented AI", () =>
  expect(
    encounterPool(1, new Set(["hover-shooter", "rusher"]))
      .map((p) => p.id)
      .sort(),
  ).toEqual(["crawler", "sentry-drone"]));
