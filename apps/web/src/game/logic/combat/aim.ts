import { angleBetween, distSq } from "@dh/utils";
import type { Vec2 } from "../input.ts";

export const AUTO_AIM_RANGE = 160;

export interface AimTarget {
  id: number;
  x: number;
  y: number;
  /** False when dead or behind a wall; the caller decides. */
  visible: boolean;
}

/**
 * Auto-aim (DESIGN.md §7.2): the nearest visible enemy within 160 px, else toward `facing`
 * (the point ahead of the Runner). Radians.
 */
export function assistAngle(
  origin: Vec2,
  facing: Vec2,
  targets: readonly AimTarget[],
  prevAngle: number,
  range = AUTO_AIM_RANGE,
): number {
  const t = nearest(targets, origin, range);
  if (t && (t.x !== origin.x || t.y !== origin.y))
    return angleBetween(origin.x, origin.y, t.x, t.y);
  // A facing point on the Runner has no direction; keep the last one.
  return facing.x === origin.x && facing.y === origin.y
    ? prevAngle
    : angleBetween(origin.x, origin.y, facing.x, facing.y);
}

/** Nearest visible target within `range` of `from`, if any. */
export function nearest(
  targets: readonly AimTarget[],
  from: Vec2,
  range: number,
): AimTarget | undefined {
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
