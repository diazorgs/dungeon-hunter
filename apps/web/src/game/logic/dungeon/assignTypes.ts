import type { SectorId } from "@dh/shared";
import type { Rng } from "@dh/utils";
import { dirBetween } from "./types.ts";
import type { Cell, GenerateOpts, RoomNode, RoomType } from "./types.ts";

export const MIN_BOSS_DEPTH = 4;
export const COMBAT_MIN = 4;
export const COMBAT_MAX = 6;

export const hasVendor = (sector: SectorId, opts: GenerateOpts): boolean =>
  sector >= 2 && opts.includeVendor !== false;

/** BFS depth from room 0 over the edge list. */
export function depths(count: number, edges: readonly [number, number][]): number[] {
  const adj = adjacency(count, edges);
  const depth = Array<number>(count).fill(-1);
  depth[0] = 0;
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    for (const j of adj[i]!) {
      if (depth[j] !== -1) continue;
      depth[j] = depth[i]! + 1;
      queue.push(j);
    }
  }
  return depth;
}

export function adjacency(count: number, edges: readonly [number, number][]): number[][] {
  const adj: number[][] = Array.from({ length: count }, () => []);
  for (const [a, b] of edges) {
    adj[a]!.push(b);
    adj[b]!.push(a);
  }
  return adj;
}

/** Room types under DESIGN.md §7.3; null when this shape cannot satisfy the rules. */
export function assignTypes(
  rng: Rng,
  cells: readonly Cell[],
  edges: readonly [number, number][],
  sector: SectorId,
  opts: GenerateOpts,
): RoomNode[] | null {
  const n = cells.length;
  const adj = adjacency(n, edges);
  const depth = depths(n, edges);
  const maxDepth = Math.max(...depth);
  if (maxDepth < MIN_BOSS_DEPTH) return null;

  const vendor = hasVendor(sector, opts) ? 1 : 0;
  let log = opts.includeLog === false ? 0 : rng.chance(0.5) ? 1 : 0;
  // A log room absorbs one extra room, or gives one back, to keep combat in 4–6.
  if (n - 3 - vendor - log > COMBAT_MAX && opts.includeLog !== false) log = 1;
  if (n - 3 - vendor - log < COMBAT_MIN) log = 0;
  const combat = n - 3 - vendor - log;
  if (combat < COMBAT_MIN || combat > COMBAT_MAX) return null;

  const types: RoomType[] = Array<RoomType>(n).fill("combat");
  types[0] = "start";
  // The farthest room in a tree is always a leaf, so it is a dead end.
  const boss = rng.pick(depth.map((_, i) => i).filter((i) => depth[i] === maxDepth));
  types[boss] = "boss";
  const take = (pool: number[]) => {
    if (pool.length === 0) return null;
    const i = rng.pick(pool);
    pool.splice(pool.indexOf(i), 1);
    return i;
  };
  // Depth ≥ 2: never adjacent to Start.
  const deep = depth.map((_, i) => i).filter((i) => depth[i]! >= 2 && i !== boss);
  const chest = take(deep);
  if (chest === null) return null;
  types[chest] = "chest";
  if (vendor) {
    const v = take(deep);
    if (v === null) return null;
    types[v] = "vendor";
  }
  if (log) {
    const free = types.map((_, i) => i).filter((i) => types[i] === "combat");
    types[rng.pick(free)] = "log";
  }

  return cells.map((c, i) => ({
    id: i,
    gx: c.gx,
    gy: c.gy,
    type: types[i]!,
    doors: adj[i]!.map((j) => dirBetween(c, cells[j]!)),
    depth: depth[i]!,
  }));
}
