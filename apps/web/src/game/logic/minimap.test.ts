import { expect, test } from "vite-plus/test";
import type { DungeonLayout, RoomNode } from "./dungeon/types.ts";
import { minimapCells } from "./minimap.ts";

const room = (id: number, gx: number, type: RoomNode["type"]): RoomNode => ({
  id,
  gx,
  gy: 2,
  type,
  doors: [],
  depth: id,
});
// Line: start(0) – combat(1) – chest(2) – boss(3)
const layout: DungeonLayout = {
  seed: "S",
  sector: 1,
  attempts: 1,
  rooms: [room(0, 2, "start"), room(1, 3, "combat"), room(2, 4, "chest"), room(3, 1, "boss")],
  edges: [
    [0, 1],
    [1, 2],
    [0, 3],
  ],
};
const ids = (cells: ReturnType<typeof minimapCells>) => cells.map((c) => `${c.roomId}:${c.state}`);

test("at start: start is current, neighbours known", () =>
  expect(ids(minimapCells(layout, new Set([0]), 0))).toEqual(["0:current", "1:known", "3:known"]));
test("a room two steps away stays hidden until its neighbour is visited", () => {
  expect(ids(minimapCells(layout, new Set([0]), 0))).not.toContain("2:known");
  expect(ids(minimapCells(layout, new Set([0, 1]), 1))).toContain("2:known");
});
test("icons show on known rooms", () =>
  expect(minimapCells(layout, new Set([0]), 0).find((c) => c.roomId === 3)?.icon).toBe("boss"));
test("in a corridor nothing is current", () =>
  expect(ids(minimapCells(layout, new Set([0, 1]), null))).toEqual([
    "0:visited",
    "1:visited",
    "2:known",
    "3:known",
  ]));
