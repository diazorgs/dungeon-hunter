import type { Rng } from "@dh/utils";
import { DIRS, GRID, START } from "./types.ts";
import type { Cell } from "./types.ts";

// Growing from the newest cell most of the time makes corridors-like chains,
// so the boss can sit ≥ 4 rooms from Start without many retries.
const EXTEND_LAST_CHANCE = 0.7;

/**
 * Tree-shaped random walk from Start: each new cell links to the cell it grew from.
 * When the newest cell is boxed in it branches from any earlier cell, so it never stalls.
 */
export function randomWalk(
  rng: Rng,
  roomCount: number,
): { cells: Cell[]; edges: [number, number][] } | null {
  const cells: Cell[] = [{ ...START }];
  const edges: [number, number][] = [];
  const taken = new Set([`${START.gx},${START.gy}`]);
  const free = (c: Cell) =>
    Object.values(DIRS)
      .map((d) => ({ gx: c.gx + d.gx, gy: c.gy + d.gy }))
      .filter(
        (n) =>
          n.gx >= 0 && n.gy >= 0 && n.gx < GRID && n.gy < GRID && !taken.has(`${n.gx},${n.gy}`),
      );

  while (cells.length < roomCount) {
    const last = cells.length - 1;
    let from = last;
    if (!(rng.chance(EXTEND_LAST_CHANCE) && free(cells[last]!).length > 0)) {
      const growable = cells.map((_, i) => i).filter((i) => free(cells[i]!).length > 0);
      if (growable.length === 0) return null;
      from = rng.pick(growable);
    }
    const next = rng.pick(free(cells[from]!));
    taken.add(`${next.gx},${next.gy}`);
    cells.push(next);
    edges.push([from, cells.length - 1]);
  }
  return { cells, edges };
}
