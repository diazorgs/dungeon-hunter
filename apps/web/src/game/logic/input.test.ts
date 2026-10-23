import { expect, test } from "vite-plus/test";
import { normalizeMove, padAimPoint, stickToMove } from "./input.ts";

test("diagonal is normalized", () => {
  const m = normalizeMove(true, false, false, true);
  expect(Math.hypot(m.x, m.y)).toBeCloseTo(1);
  expect(m.x).toBeGreaterThan(0);
  expect(m.y).toBeLessThan(0);
});
test("opposing keys cancel", () =>
  expect(normalizeMove(true, true, true, true)).toEqual({ x: 0, y: 0 }));
test("stick inside deadzone is zero", () => expect(stickToMove(0.1, 0.1)).toEqual({ x: 0, y: 0 }));
test("full stick has length 1", () => {
  const m = stickToMove(1, 1);
  expect(Math.hypot(m.x, m.y)).toBeCloseTo(1);
});
test("pad aim: zero stick keeps last aim", () => {
  const last = { x: 50, y: 60 };
  expect(padAimPoint({ x: 0, y: 0 }, { x: 0, y: 0 }, last)).toBe(last);
});
test("pad aim: full right stick reaches 96 px", () =>
  expect(padAimPoint({ x: 10, y: 10 }, { x: 1, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 106, y: 10 }));
