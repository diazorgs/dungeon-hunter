import { expect, test } from "vite-plus/test";
import { composeSector, PITCH_X, wallAt } from "./compose.ts";
import { doorTiles } from "./tiled.ts";
import type { RoomTemplate } from "./tiled.ts";
import type { Dir, DungeonLayout } from "./types.ts";

const ALL: Dir[] = ["N", "E", "S", "W"];
const walls = Array<number>(165).fill(0);
for (let y = 0; y < 11; y++)
  for (let x = 0; x < 15; x++)
    if (x === 0 || y === 0 || x === 14 || y === 10) walls[y * 15 + x] = 3;
for (const d of ALL) for (const [x, y] of doorTiles(d)) walls[y * 15 + x] = 0;
const tpl: RoomTemplate = {
  id: "t",
  roomType: "combat",
  sectors: [1],
  doors: ALL,
  width: 15,
  height: 11,
  floor: Array(165).fill(1),
  walls,
  decor: Array(165).fill(0),
  spawns: [{ kind: "guardian", x: 24, y: 40 }],
};
const layout: DungeonLayout = {
  seed: "S",
  sector: 1,
  attempts: 1,
  edges: [[0, 1]],
  rooms: [
    { id: 0, gx: 2, gy: 2, type: "start", doors: ["E"], depth: 0, templateId: "t" },
    { id: 1, gx: 3, gy: 2, type: "combat", doors: ["W"], depth: 1, templateId: "t" },
  ],
};
const c = composeSector(layout, new Map([["t", tpl]]), { corridorFloor: 2, corridorWall: 3 });
const at = (layer: Int32Array, x: number, y: number) => layer[y * c.widthTiles + x];

test("sector size is 5 pitches each way", () =>
  expect([c.widthTiles, c.heightTiles]).toEqual([95, 75]));
test("E–W corridor is 3 floor tiles wide, 4 long, walled both sides", () => {
  const ox = 2 * PITCH_X + 15;
  const oy = 2 * 15;
  for (let i = 0; i < 4; i++) {
    for (const row of [4, 5, 6])
      expect([at(c.floor, ox + i, oy + row), at(c.walls, ox + i, oy + row)]).toEqual([2, 0]);
    expect(at(c.walls, ox + i, oy + 3)).toBe(3);
    expect(at(c.walls, ox + i, oy + 7)).toBe(3);
  }
});
test("unused north door is sealed", () => expect(at(c.walls, 2 * PITCH_X + 7, 2 * 15)).toBe(3));
test("spawns are offset by the room's grid position", () =>
  expect(c.spawns.find((s) => s.roomId === 1)).toMatchObject({
    x: 3 * PITCH_X * 16 + 24,
    y: 2 * 15 * 16 + 40,
  }));
test("only used doors are reported", () =>
  expect(c.doors.map((d) => `${d.roomId}${d.dir}`).sort()).toEqual(["0E", "1W"]));
test("wallAt treats out-of-bounds as wall", () => {
  expect(wallAt(c, -1, 5)).toBe(true);
  expect(wallAt(c, (2 * PITCH_X + 7) * 16 + 8, (2 * 15 + 5) * 16 + 8)).toBe(false);
});
