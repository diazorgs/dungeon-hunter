import { WEAPONS } from "@dh/shared";
import { radToDeg } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { fireIntervalMs, pelletAngles, shotsDue } from "./fire.ts";

test("holding at 4/s fires on the interval", () => {
  const c = { nextShotAt: 0 };
  expect(shotsDue(c, 0, 250, true)).toBe(1);
  expect(shotsDue(c, 249, 250, true)).toBe(0);
  expect(shotsDue(c, 250, 250, true)).toBe(1);
});
test("a 1000 ms frame at 12/s is capped at 3 shots", () => {
  const c = { nextShotAt: 0 };
  expect(shotsDue(c, 1000, 1000 / 12, true)).toBe(3);
  expect(shotsDue(c, 1016, 1000 / 12, true)).toBeLessThanOrEqual(1);
});
test("25 fps does not drop shots at 12/s", () => {
  const c = { nextShotAt: 0 };
  let shots = 0;
  for (let t = 0; t <= 1040; t += 40) shots += shotsDue(c, t, 1000 / 12, true);
  expect(shots).toBe(13);
});
test("re-pressing never beats the rate", () => {
  const c = { nextShotAt: 0 };
  shotsDue(c, 0, 250, true);
  expect(shotsDue(c, 50, 250, false)).toBe(0);
  expect(shotsDue(c, 100, 250, true)).toBe(0);
});
test("five pellets fan symmetric across 30°", () => {
  const a = pelletAngles(0, 5, 30, () => 0.5).map(radToDeg);
  expect(a[0]).toBeCloseTo(-15);
  expect(a[2]).toBeCloseTo(0);
  expect(a[4]).toBeCloseTo(15);
});
test("single pellet stays inside the spread", () => {
  expect(radToDeg(pelletAngles(0, 1, 12, () => 0)[0]!)).toBeCloseTo(-6);
  expect(radToDeg(pelletAngles(0, 1, 12, () => 0.999)[0]!)).toBeLessThan(6);
});
test("fire interval honours the multiplier", () =>
  expect(fireIntervalMs(WEAPONS["rivet-smg"], 2)).toBeCloseTo(41.67, 1));
