import { expect, test } from "vite-plus/test";
import { AUTO_TILES, autotile } from "./autotile.ts";

// 4×4: a wall row on top, floor below, a one-cell pillar at (2,2).
const W = 4;
const floor = Int32Array.from([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
const walls = Int32Array.from([3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0]);
const out = autotile(floor, walls, W);
const cap = (mask: number) => AUTO_TILES.capBase + mask;

test("walls with open floor below show a face on their own cell", () => {
  expect([...out.faces.subarray(0, 4)]).toEqual(Array(4).fill(AUTO_TILES.wallFace));
  expect(out.faces[10]).toBe(AUTO_TILES.wallFace);
  expect(out.faces[6]).toBe(0);
});

test("caps sit one row above their wall, edges masked by open sides", () => {
  // The pillar at row 2 caps row 1, open on all four sides.
  expect(out.caps[6]).toBe(cap(1 | 2 | 4 | 8));
  // The top row has no row above it, so its caps are off the map.
  expect([...out.caps.subarray(0, 4)]).toEqual([0, 0, 0, 0]);
});

test("floor under a wall is shaded; inputs are untouched", () => {
  expect([...out.floor.subarray(4, 8)]).toEqual(Array(4).fill(AUTO_TILES.floorShadow));
  expect(out.floor[14]).toBe(AUTO_TILES.floorShadow);
  expect(walls[0]).toBe(3);
  expect(floor[4]).toBe(1);
});

test("caps of a wall run do not mark the shared sides as open", () => {
  const row = autotile(new Int32Array(9).fill(1), Int32Array.from([0, 0, 0, 0, 0, 0, 3, 3, 3]), 3);
  // Left end: open N, S, W; middle: open N, S; right end: open N, E, S.
  expect([...row.caps.subarray(3, 6)]).toEqual([cap(1 | 4 | 8), cap(1 | 4), cap(1 | 2 | 4)]);
});

test("floor variants are deterministic and sparse", () => {
  const n = 10_000;
  const big = autotile(new Int32Array(n).fill(1), new Int32Array(n), 100);
  const variants = big.floor.filter((v) => v !== 1).length;
  expect(variants / n).toBeGreaterThan(0.05);
  expect(variants / n).toBeLessThan(0.2);
  expect(autotile(new Int32Array(n).fill(1), new Int32Array(n), 100).floor).toEqual(big.floor);
});
