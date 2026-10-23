import { MODS, RUNNERS } from "@dh/shared";
import { expect, test } from "vite-plus/test";
import type { ActiveBuffs } from "./buffs.ts";
import { addBuff, effectiveEnergyCost, effectiveFireRateMul, isActive } from "./buffs.ts";
import { deriveStats } from "./stats.ts";

const fresh = (): ActiveBuffs => ({ until: {} });

test("overcharge lasts exactly 5 s", () => {
  const b = fresh();
  addBuff(b, "overcharge", 0, 5000);
  expect(isActive(b, "overcharge", 4999)).toBe(true);
  expect(isActive(b, "overcharge", 5000)).toBe(false);
});
test("fire rate doubles on top of cooling fins", () => {
  const b = fresh();
  addBuff(b, "overcharge", 0, 5000);
  const stats = deriveStats(RUNNERS.vex, [MODS["cooling-fins"]]);
  expect(effectiveFireRateMul(stats, b, 100)).toBeCloseTo(2.4);
  expect(effectiveFireRateMul(stats, b, 6000)).toBeCloseTo(1.2);
});
test("energy cost is 0 while active", () => {
  const b = fresh();
  addBuff(b, "overcharge", 0, 5000);
  expect(effectiveEnergyCost(3, b, 100)).toBe(0);
  expect(effectiveEnergyCost(3, b, 5000)).toBe(3);
});
test("re-adding refreshes instead of stacking", () => {
  const b = fresh();
  addBuff(b, "overcharge", 0, 5000);
  addBuff(b, "overcharge", 3000, 5000);
  expect(b.until.overcharge).toBe(8000);
});
