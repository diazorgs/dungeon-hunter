import { WEAPONS } from "@dh/shared";
import { degToRad } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { beamDps } from "./beam.ts";
import { IMPLEMENTED_BEHAVIOURS } from "./behaviours.ts";
import { chainTargets } from "./chain.ts";
import { chargedShot, chargeLevel } from "./charge.ts";
import { explosionDamage } from "./explosion.ts";
import { inMeleeArc } from "./melee.ts";

const o = { x: 0, y: 0 };

test("melee arc edges are inside, behind is outside", () => {
  expect(
    inMeleeArc(o, 0, 100, 22, { x: Math.cos(degToRad(50)) * 22, y: Math.sin(degToRad(50)) * 22 }),
  ).toBe(true);
  expect(inMeleeArc(o, 0, 100, 22, { x: 23, y: 0 })).toBe(false);
  expect(inMeleeArc(o, 0, 100, 22, { x: -10, y: 0 })).toBe(false);
});
test("chain picks nearest unvisited each hop and stops when none in range", () => {
  const c = [
    { id: 2, x: 30, y: 0, visible: true },
    { id: 3, x: 60, y: 0, visible: true },
    { id: 4, x: 20, y: 0, visible: true },
    { id: 5, x: 500, y: 0, visible: true },
  ];
  expect(chainTargets({ id: 1, x: 0, y: 0 }, c, 2, 48)).toEqual([4, 2]);
  expect(chainTargets({ id: 1, x: 0, y: 0 }, c, 9, 48)).toEqual([4, 2, 3]);
  expect(chainTargets({ id: 1, x: 0, y: 0 }, c, 2, 48, () => false)).toEqual([]);
});
test("beam ramps 8 → 20 over 1.5 s", () => {
  const p = { baseDps: 8, maxDps: 20, rampSec: 1.5 };
  expect([beamDps(0, p), beamDps(1500, p), beamDps(9999, p)]).toEqual([8, 20, 20]);
});
test("charge below 30 % cancels", () => {
  expect(chargedShot(0.29).fire).toBe(false);
  expect(chargedShot(chargeLevel(1000, 1))).toEqual({ fire: true, powerMul: 1 });
});
test("explosion falloff", () =>
  expect([
    explosionDamage(10, 0, 32),
    explosionDamage(10, 32, 32),
    explosionDamage(10, 33, 32),
  ]).toEqual([10, 5, 0]));
test("every weapon behaviour is implemented", () => {
  for (const w of Object.values(WEAPONS)) expect(IMPLEMENTED_BEHAVIOURS).toContain(w.behaviour);
});
