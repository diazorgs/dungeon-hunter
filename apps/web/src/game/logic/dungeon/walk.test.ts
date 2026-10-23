import { createRng } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { randomWalk } from "./walk.ts";

test("walk shape invariants", () => {
  for (let i = 0; i < 200; i++) {
    const w = randomWalk(createRng(`w${i}`), 9)!;
    expect(w.cells[0]).toEqual({ gx: 2, gy: 2 });
    expect(w.edges).toHaveLength(w.cells.length - 1);
    expect(new Set(w.cells.map((c) => `${c.gx},${c.gy}`)).size).toBe(9);
    for (const c of w.cells) expect(c.gx >= 0 && c.gx < 5 && c.gy >= 0 && c.gy < 5).toBe(true);
    for (const [a, b] of w.edges) {
      const ca = w.cells[a]!,
        cb = w.cells[b]!;
      expect(Math.abs(ca.gx - cb.gx) + Math.abs(ca.gy - cb.gy)).toBe(1);
    }
  }
});
test("deterministic for the same stream", () =>
  expect(randomWalk(createRng("same"), 8)).toEqual(randomWalk(createRng("same"), 8)));
test("filling the whole grid terminates", { timeout: 1000 }, () => {
  const w = randomWalk(createRng("full"), 25);
  expect(w === null || w.cells.length === 25).toBe(true);
});
