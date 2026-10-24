import { expect, test } from "vite-plus/test";
import { clampHpToGate, electrifiedTiles, lockdownRings, spiralCadenceMs } from "./warden.ts";

test("a 900 hit from full stops at the 66 % gate", () =>
  expect(clampHpToGate(1200 - 900, 1200, new Set())).toBe(792));
test("after the 66 % gate, the same hit stops at 33 %", () =>
  expect(clampHpToGate(300, 1200, new Set([0.66]))).toBe(396));
test("all gates done: no clamp", () =>
  expect(clampHpToGate(10, 1200, new Set([0.66, 0.33, 0.15]))).toBe(10));
test("lockdown rings", () =>
  expect([lockdownRings(0), lockdownRings(4000), lockdownRings(60_000)]).toEqual([0, 1, 2]));
test("two rings leave exactly the central 9×5", () => {
  const hot = new Set(electrifiedTiles({ w: 13, h: 9 }, 2).map((t) => `${t.x},${t.y}`));
  expect(13 * 9 - hot.size).toBe(45);
  for (let x = 2; x <= 10; x++)
    for (let y = 2; y <= 6; y++) expect(hot.has(`${x},${y}`)).toBe(false);
});
test("spiral cadence", () =>
  expect([spiralCadenceMs(0.33), spiralCadenceMs(0)]).toEqual([140, 70]));
