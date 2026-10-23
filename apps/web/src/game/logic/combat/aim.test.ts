import { radToDeg } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { assistAngle } from "./aim.ts";

const o = { x: 0, y: 0 };
const t = (id: number, x: number, y: number, visible = true) => ({ id, x, y, visible });

test("no targets: aim at cursor", () =>
  expect(assistAngle(o, { x: 100, y: 0 }, [], "soft", 0)).toBeCloseTo(0));
test("cursor on origin keeps previous angle", () =>
  expect(assistAngle(o, o, [], "soft", 1.2)).toBe(1.2));
test("soft bends toward target near cursor, capped at 8°", () => {
  const a = assistAngle(o, { x: 100, y: 0 }, [t(1, 100, 20)], "soft", 0);
  expect(radToDeg(a)).toBeCloseTo(8, 1); // atan(20/100)=11.3° → capped
});
test("soft bends fully when under the cap", () => {
  const a = assistAngle(o, { x: 100, y: 0 }, [t(1, 100, 5)], "soft", 0);
  expect(a).toBeCloseTo(Math.atan2(5, 100));
});
test("soft ignores targets beyond 24 px of cursor", () =>
  expect(assistAngle(o, { x: 100, y: 0 }, [t(1, 100, 30)], "soft", 0)).toBeCloseTo(0));
test("soft prefers target closest to cursor, not to the runner", () => {
  const a = assistAngle(o, { x: 100, y: 0 }, [t(1, 85, -15), t(2, 100, 5)], "soft", 0);
  expect(a).toBeCloseTo(Math.atan2(5, 100));
});
test("soft ignores invisible targets", () =>
  expect(assistAngle(o, { x: 100, y: 0 }, [t(1, 100, 5, false)], "soft", 0)).toBeCloseTo(0));
test("full aims at nearest visible within 160", () => {
  const a = assistAngle(
    o,
    { x: 100, y: 0 },
    [t(1, 0, 20, false), t(2, 0, -50), t(3, 0, 90)],
    "full",
    0,
  );
  expect(a).toBeCloseTo(-Math.PI / 2);
});
test("full falls back to cursor when none in range", () =>
  expect(assistAngle(o, { x: 0, y: 100 }, [t(1, 200, 0)], "full", 0)).toBeCloseTo(Math.PI / 2));
