import { expect, test } from "vite-plus/test";
import { lineClear } from "./los.ts";

// A wall occupying x in [40, 56).
const wall = (x: number) => x >= 40 && x < 56;

test("clear line", () => expect(lineClear(wall, { x: 0, y: 0 }, { x: 30, y: 0 })).toBe(true));
test("wall in between blocks", () =>
  expect(lineClear(wall, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(false));
