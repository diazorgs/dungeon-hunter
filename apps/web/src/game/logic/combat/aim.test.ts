import { expect, test } from "vite-plus/test";
import { assistAngle } from "./aim.ts";

const o = { x: 0, y: 0 };
const t = (id: number, x: number, y: number, visible = true) => ({ id, x, y, visible });

test("no targets: aim where the Runner faces", () =>
  expect(assistAngle(o, { x: 100, y: 0 }, [], 0)).toBeCloseTo(0));
test("facing point on origin keeps previous angle", () =>
  expect(assistAngle(o, o, [], 1.2)).toBe(1.2));
test("aims at the nearest visible target within 160", () => {
  const a = assistAngle(o, { x: 100, y: 0 }, [t(1, 0, 20, false), t(2, 0, -50), t(3, 0, 90)], 0);
  expect(a).toBeCloseTo(-Math.PI / 2);
});
test("ignores invisible targets", () =>
  expect(assistAngle(o, { x: 100, y: 0 }, [t(1, 0, 30, false)], 0)).toBeCloseTo(0));
test("falls back to facing when none in range", () =>
  expect(assistAngle(o, { x: 0, y: 100 }, [t(1, 200, 0)], 0)).toBeCloseTo(Math.PI / 2));
test("a custom range limits the lock-on", () =>
  expect(assistAngle(o, { x: 100, y: 0 }, [t(1, 0, 50)], 0, 40)).toBeCloseTo(0));
