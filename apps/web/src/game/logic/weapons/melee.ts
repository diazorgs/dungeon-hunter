import { angleBetween, angleDiff, degToRad } from "@dh/utils";
import type { Vec2 } from "../input.ts";

/** True when `p` is within `range` and inside the arc centred on `aim` (edges inclusive). */
export function inMeleeArc(
  origin: Vec2,
  aim: number,
  arcDeg: number,
  range: number,
  p: Vec2,
): boolean {
  if (Math.hypot(p.x - origin.x, p.y - origin.y) > range + 1e-9) return false;
  return (
    Math.abs(angleDiff(aim, angleBetween(origin.x, origin.y, p.x, p.y))) <=
    degToRad(arcDeg) / 2 + 1e-9
  );
}
