import { COMBAT_MAX, COMBAT_MIN, MIN_BOSS_DEPTH, depths } from "./assignTypes.ts";
import { DIRS, OPPOSITE, START } from "./types.ts";
import type { DungeonLayout, RoomType } from "./types.ts";

export function isReachable(layout: DungeonLayout): boolean {
  return depths(layout.rooms.length, layout.edges).every((d) => d >= 0);
}

/** One message per violated rule; empty means valid. */
export function validateLayout(layout: DungeonLayout): string[] {
  const errors: string[] = [];
  const { rooms } = layout;
  const count = (t: RoomType) => rooms.filter((r) => r.type === t).length;

  if (rooms.length < 7 || rooms.length > 9) errors.push(`room count ${rooms.length} not in 7–9`);
  const start = rooms[0];
  if (!start || start.type !== "start" || start.gx !== START.gx || start.gy !== START.gy)
    errors.push("room 0 must be the start at (2,2)");
  for (const t of ["start", "boss", "chest"] as const)
    if (count(t) !== 1) errors.push(`expected 1 ${t} room, got ${count(t)}`);
  const maxVendor = layout.sector === 1 ? 0 : 1;
  if (count("vendor") > maxVendor) errors.push(`too many vendor rooms: ${count("vendor")}`);
  if (count("log") > 1) errors.push(`too many log rooms: ${count("log")}`);
  if (count("combat") < COMBAT_MIN || count("combat") > COMBAT_MAX)
    errors.push(`combat rooms ${count("combat")} not in ${COMBAT_MIN}–${COMBAT_MAX}`);

  const boss = rooms.find((r) => r.type === "boss");
  const maxDepth = Math.max(...rooms.map((r) => r.depth));
  if (boss) {
    if (boss.depth < MIN_BOSS_DEPTH) errors.push(`boss depth ${boss.depth} < ${MIN_BOSS_DEPTH}`);
    if (boss.depth !== maxDepth) errors.push("boss is not the farthest room");
    if (boss.doors.length !== 1)
      errors.push(`boss must be a dead end, has ${boss.doors.length} doors`);
  }
  const startNeighbours = new Set(
    layout.edges.flatMap(([a, b]) => (a === 0 ? [b] : b === 0 ? [a] : [])),
  );
  for (const r of rooms)
    if ((r.type === "chest" || r.type === "vendor") && startNeighbours.has(r.id))
      errors.push(`${r.type} room ${r.id} is adjacent to start`);
  if (!isReachable(layout)) errors.push("not every room is reachable from start");

  const at = new Map(rooms.map((r) => [`${r.gx},${r.gy}`, r]));
  for (const r of rooms)
    for (const d of r.doors) {
      const other = at.get(`${r.gx + DIRS[d].gx},${r.gy + DIRS[d].gy}`);
      if (!other || !other.doors.includes(OPPOSITE[d]))
        errors.push(`room ${r.id} door ${d} has no matching door`);
    }
  return errors;
}
