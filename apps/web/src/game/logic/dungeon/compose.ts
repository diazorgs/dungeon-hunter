import { doorTiles, ROOM_H, ROOM_W } from "./tiled.ts";
import type { RoomTemplate, SpawnKind } from "./tiled.ts";
import { GRID } from "./types.ts";
import type { Dir, DungeonLayout, RoomType } from "./types.ts";

export const TILE_PX = 16;
/** Room + 4-tile corridor (DESIGN.md §7.3). */
export const PITCH_X = 19;
export const PITCH_Y = 15;
const CORRIDOR = 4;

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComposedRoom {
  id: number;
  type: RoomType;
  rect: TileRect;
  worldRect: Rect;
}

export interface ComposedSector {
  widthTiles: number;
  heightTiles: number;
  floor: Int32Array;
  walls: Int32Array;
  decor: Int32Array;
  rooms: ComposedRoom[];
  /** Only doors that lead somewhere (unused openings are sealed). */
  doors: { roomId: number; dir: Dir; tileRect: TileRect }[];
  spawns: { roomId: number; kind: SpawnKind; x: number; y: number }[];
}

/** Stitches room templates and corridors into one sector grid of tile ids (0 = empty). */
export function composeSector(
  layout: DungeonLayout,
  templates: ReadonlyMap<string, RoomTemplate>,
  tiles: { corridorFloor: number; corridorWall: number },
): ComposedSector {
  const widthTiles = GRID * PITCH_X;
  const heightTiles = GRID * PITCH_Y;
  const size = widthTiles * heightTiles;
  const out: ComposedSector = {
    widthTiles,
    heightTiles,
    floor: new Int32Array(size),
    walls: new Int32Array(size),
    decor: new Int32Array(size),
    rooms: [],
    doors: [],
    spawns: [],
  };
  const set = (layer: Int32Array, x: number, y: number, v: number) =>
    (layer[y * widthTiles + x] = v);

  for (const room of layout.rooms) {
    const t = templates.get(room.templateId ?? "");
    if (!t) throw new Error(`room ${room.id}: template "${room.templateId}" not loaded`);
    const ox = room.gx * PITCH_X;
    const oy = room.gy * PITCH_Y;
    for (let y = 0; y < ROOM_H; y++)
      for (let x = 0; x < ROOM_W; x++) {
        const i = y * ROOM_W + x;
        set(out.floor, ox + x, oy + y, t.floor[i]!);
        set(out.walls, ox + x, oy + y, t.walls[i]!);
        set(out.decor, ox + x, oy + y, t.decor[i]!);
      }
    // Seal openings the layout does not use.
    for (const d of t.doors)
      if (!room.doors.includes(d))
        for (const [x, y] of doorTiles(d)) set(out.walls, ox + x, oy + y, tiles.corridorWall);
    for (const d of room.doors) {
      const cells = doorTiles(d);
      const xs = cells.map((c) => c[0]);
      const ys = cells.map((c) => c[1]);
      out.doors.push({
        roomId: room.id,
        dir: d,
        tileRect: {
          x: ox + Math.min(...xs),
          y: oy + Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs) + 1,
          h: Math.max(...ys) - Math.min(...ys) + 1,
        },
      });
    }
    out.rooms.push({
      id: room.id,
      type: room.type,
      rect: { x: ox, y: oy, w: ROOM_W, h: ROOM_H },
      worldRect: {
        x: ox * TILE_PX,
        y: oy * TILE_PX,
        width: ROOM_W * TILE_PX,
        height: ROOM_H * TILE_PX,
      },
    });
    for (const s of t.spawns)
      out.spawns.push({
        roomId: room.id,
        kind: s.kind,
        x: ox * TILE_PX + s.x,
        y: oy * TILE_PX + s.y,
      });
  }

  // Corridors: 3-wide floor between the two door openings, walls on both sides.
  for (const [a, b] of layout.edges) {
    const ra = layout.rooms[a]!;
    const rb = layout.rooms[b]!;
    const [first] = ra.gx + ra.gy < rb.gx + rb.gy ? [ra, rb] : [rb, ra];
    const horizontal = ra.gy === rb.gy;
    const ox = first.gx * PITCH_X;
    const oy = first.gy * PITCH_Y;
    for (let i = 0; i < CORRIDOR; i++)
      for (let k = -2; k <= 2; k++) {
        const x = horizontal ? ox + ROOM_W + i : ox + 7 + k;
        const y = horizontal ? oy + 5 + k : oy + ROOM_H + i;
        const edge = Math.abs(k) === 2;
        set(out.floor, x, y, edge ? 0 : tiles.corridorFloor);
        set(out.walls, x, y, edge ? tiles.corridorWall : 0);
      }
  }
  return out;
}

/** True when the tile at world (x, y) is a wall. */
export function wallAt(c: ComposedSector, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE_PX);
  const ty = Math.floor(y / TILE_PX);
  if (tx < 0 || ty < 0 || tx >= c.widthTiles || ty >= c.heightTiles) return true;
  return c.walls[ty * c.widthTiles + tx] !== 0;
}
