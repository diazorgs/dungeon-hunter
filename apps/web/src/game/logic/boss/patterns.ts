import { degToRad } from "@dh/utils";

/** `count` evenly spaced angles, starting at `offset`. */
export const ring = (count: number, offset = 0): number[] =>
  Array.from({ length: count }, (_, i) => offset + (i / count) * Math.PI * 2);

/** `count` angles fanned evenly across `arcDeg`, centred on `aim`. */
export function spread(aim: number, count: number, arcDeg: number): number[] {
  if (count <= 1) return [aim];
  const arc = degToRad(arcDeg);
  return Array.from({ length: count }, (_, i) => aim - arc / 2 + (i / (count - 1)) * arc);
}

/** One tick of a rotating spiral: `arms` evenly spaced, rotated by `step × stepDeg`. */
export const spiralStep = (arms: number, step: number, stepDeg: number): number[] =>
  ring(arms, degToRad(step * stepDeg));

export const aimedBurst = (
  aim: number,
  count: number,
  jitterDeg: number,
  rand: () => number,
): number[] => Array.from({ length: count }, () => aim + degToRad((rand() * 2 - 1) * jitterDeg));
