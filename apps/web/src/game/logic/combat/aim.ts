import { angleBetween, angleDiff, degToRad, distSq } from "@dh/utils";
import type { Vec2 } from "../input.ts";

export const SOFT_ASSIST_MAX_DEG = 8;
export const SOFT_CAPTURE_RADIUS = 24;
export const FULL_AUTO_RANGE = 160;

export interface AimTarget {
  id: number;
  x: number;
  y: number;
  /** False when dead or behind a wall; the caller decides. */
  visible: boolean;
}

/** Final aim angle (radians) for the given mode (DESIGN.md §7.2). */
export function assistAngle(
  origin: Vec2,
  cursor: Vec2,
  targets: readonly AimTarget[],
  mode: "soft" | "full",
  prevAngle: number,
): number {
  // A cursor sitting on the Runner has no direction; keep the last one.
  const cursorAngle =
    cursor.x === origin.x && cursor.y === origin.y
      ? prevAngle
      : angleBetween(origin.x, origin.y, cursor.x, cursor.y);

  if (mode === "full") {
    const t = nearest(targets, origin, FULL_AUTO_RANGE);
    return t ? angleBetween(origin.x, origin.y, t.x, t.y) : cursorAngle;
  }

  const t = nearest(targets, cursor, SOFT_CAPTURE_RADIUS);
  if (!t || (t.x === origin.x && t.y === origin.y)) return cursorAngle;
  const max = degToRad(SOFT_ASSIST_MAX_DEG);
  const bend = angleDiff(cursorAngle, angleBetween(origin.x, origin.y, t.x, t.y));
  return cursorAngle + Math.max(-max, Math.min(max, bend));
}

function nearest(targets: readonly AimTarget[], from: Vec2, range: number): AimTarget | undefined {
  let best: AimTarget | undefined;
  let bestD = range * range;
  for (const t of targets) {
    if (!t.visible) continue;
    const d = distSq(from.x, from.y, t.x, t.y);
    if (d <= bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}
