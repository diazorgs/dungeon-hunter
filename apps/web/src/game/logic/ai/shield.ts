import { angleDiff, degToRad } from "@dh/utils";

/**
 * True when a bullet travelling at `incomingAngle` hits the shield's front arc,
 * i.e. it is heading against the direction the shield faces (half-arc inclusive).
 */
export const blockedByShield = (facing: number, incomingAngle: number, arcDeg: number): boolean =>
  Math.abs(angleDiff(facing, incomingAngle + Math.PI)) <= degToRad(arcDeg) / 2 + 1e-9;
