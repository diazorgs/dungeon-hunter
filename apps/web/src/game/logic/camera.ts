import type { Rect } from "./dungeon/compose.ts";
import type { Vec2 } from "./input.ts";

/** Id of the room containing `p`, ignoring an `insetPx` margin so doorways don't flicker. */
export function roomAt(
  p: Vec2,
  rooms: readonly { id: number; worldRect: Rect }[],
  insetPx = 8,
): number | null {
  for (const r of rooms) {
    const w = r.worldRect;
    if (
      p.x >= w.x + insetPx &&
      p.x <= w.x + w.width - insetPx &&
      p.y >= w.y + insetPx &&
      p.y <= w.y + w.height - insetPx
    )
      return r.id;
  }
  return null;
}

/** Room centre while inside a room, the player in corridors. */
export function cameraTarget(p: Vec2, rooms: readonly { id: number; worldRect: Rect }[]): Vec2 {
  const id = roomAt(p, rooms);
  const r = rooms.find((room) => room.id === id);
  return r
    ? { x: r.worldRect.x + r.worldRect.width / 2, y: r.worldRect.y + r.worldRect.height / 2 }
    : { ...p };
}
