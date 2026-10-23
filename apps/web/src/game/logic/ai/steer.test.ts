import { expect, test } from "vite-plus/test";
import { orbit, seek, separation } from "./steer.ts";

const len = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);

test("seek has the given speed and is zero at the target", () => {
  expect(len(seek({ x: 0, y: 0 }, { x: 3, y: 4 }, 10))).toBeCloseTo(10);
  expect(seek({ x: 1, y: 1 }, { x: 1, y: 1 }, 10)).toEqual({ x: 0, y: 0 });
});
test("orbit at radius is tangent", () => {
  const v = orbit({ x: 50, y: 0 }, { x: 0, y: 0 }, 50, 20, 1);
  expect(v.x).toBeCloseTo(0);
  expect(len(v)).toBeCloseTo(20);
});
test("orbit outside the radius steers inward", () =>
  expect(orbit({ x: 100, y: 0 }, { x: 0, y: 0 }, 50, 20, 1).x).toBeLessThan(0));
test("separation pushes away inside radius only", () => {
  expect(separation({ x: 0, y: 0 }, [{ x: 5, y: 0 }], 10, 1).x).toBeLessThan(0);
  expect(separation({ x: 0, y: 0 }, [{ x: 20, y: 0 }], 10, 1)).toEqual({ x: 0, y: 0 });
});
