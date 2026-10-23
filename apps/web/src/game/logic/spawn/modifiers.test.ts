import { degToRad } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { blockedByShield } from "../ai/shield.ts";
import { spawnModifiers } from "./modifiers.ts";

test("plain guardian has no modifiers", () =>
  expect(spawnModifiers({})).toEqual({
    hpMul: 1,
    scale: 1,
    bulletSpeedMul: 1,
    guaranteedOrb: false,
    deathPuddle: false,
  }));
test("bleed elite stacks", () => {
  const m = spawnModifiers({ bleed: true, elite: true });
  expect(m.hpMul).toBeCloseTo(2.8);
  expect(m).toMatchObject({ scale: 1.5, deathPuddle: true, guaranteedOrb: true });
});
test("shield blocks head-on, not from behind, half-arc inclusive", () => {
  // Shield faces east (0). A bullet flying west (π) hits the face.
  expect(blockedByShield(0, Math.PI, 100)).toBe(true);
  expect(blockedByShield(0, 0, 100)).toBe(false);
  expect(blockedByShield(0, Math.PI + degToRad(50), 100)).toBe(true);
  expect(blockedByShield(0, Math.PI + degToRad(51), 100)).toBe(false);
});
