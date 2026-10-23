import { expect, test } from "vite-plus/test";
import { angleDiff, degToRad, rotateToward } from "./math.ts";

test("angleDiff wraps across 0", () =>
  expect(angleDiff(degToRad(350), degToRad(10))).toBeCloseTo(degToRad(20)));
test("angleDiff is signed", () =>
  expect(angleDiff(degToRad(10), degToRad(350))).toBeCloseTo(degToRad(-20)));
test("rotateToward never overshoots", () => {
  expect(rotateToward(0, 0.1, 1)).toBeCloseTo(0.1);
  expect(rotateToward(0, 1, 0.25)).toBeCloseTo(0.25);
  expect(rotateToward(0, -1, 0.25)).toBeCloseTo(-0.25);
});
