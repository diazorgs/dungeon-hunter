/** Tile ids the 3/4 view adds on top of the template tiles (see scripts/gen-art.ts). */
export const AUTO_TILES = {
  wallFace: 7,
  floorA: 8,
  floorB: 9,
  floorShadow: 10,
  /** Wall caps are `capBase + mask`, mask bits set where that side is open: N 1, E 2, S 4, W 8. */
  capBase: 11,
} as const;

const PLAIN_FLOOR = 1;

/** Stable per-cell noise in [0, 1), so the same sector always looks the same. */
const noise = (i: number) => {
  const h = Math.imul(i ^ (i >>> 15), 2246822507) ^ Math.imul(i, 3266489909);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

export interface WallView {
  floor: Int32Array;
  /** Front faces, drawn under actors: a wall with no wall below it. */
  faces: Int32Array;
  /** Wall tops, raised one tile above their wall and drawn over actors. */
  caps: Int32Array;
}

/**
 * 3/4 view (DESIGN.md §11.1): every wall is a one-tile-tall block. Its front face sits on the
 * wall's own cell, its cap one cell higher, so actors pass behind south walls and pillars.
 * Floor right under a face sits in its shadow; plain floor gets a few seeded variants.
 * Collision still uses the untouched `walls` grid.
 */
export function autotile(floor: Int32Array, walls: Int32Array, width: number): WallView {
  const n = walls.length;
  const f = floor.slice();
  const faces = new Int32Array(n);
  const caps = new Int32Array(n);
  const wall = (i: number, dx: number, dy: number) => {
    const x = (i % width) + dx;
    const j = i + dy * width + dx;
    return x >= 0 && x < width && j >= 0 && j < n && walls[j] !== 0;
  };
  for (let i = 0; i < n; i++) {
    if (walls[i]) {
      if (!wall(i, 0, 1)) faces[i] = AUTO_TILES.wallFace;
      const mask =
        (wall(i, 0, -1) ? 0 : 1) |
        (wall(i, 1, 0) ? 0 : 2) |
        (wall(i, 0, 1) ? 0 : 4) |
        (wall(i, -1, 0) ? 0 : 8);
      if (i >= width) caps[i - width] = AUTO_TILES.capBase + mask;
      continue;
    }
    if (!floor[i]) continue;
    if (wall(i, 0, -1)) f[i] = AUTO_TILES.floorShadow;
    else if (floor[i] === PLAIN_FLOOR) {
      const r = noise(i);
      if (r < 0.08) f[i] = AUTO_TILES.floorA;
      else if (r < 0.13) f[i] = AUTO_TILES.floorB;
    }
  }
  return { floor: f, faces, caps };
}
