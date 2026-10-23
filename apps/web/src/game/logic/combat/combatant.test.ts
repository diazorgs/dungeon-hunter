import { expect, test } from "vite-plus/test";
import {
  applyDamage,
  createCombatant,
  gainEnergy,
  grantInvuln,
  heal,
  spendEnergy,
  tickShieldRegen,
} from "./combatant.ts";

const vex = () => createCombatant({ hp: 6, shield: 4, energy: 180 });

test("shield absorbs first", () => {
  const s = vex();
  expect(applyDamage(s, 1, 0)).toMatchObject({ shieldLost: 1, hpLost: 0 });
  expect(s.shield).toBe(3);
});
test("overflow spills into hp", () => {
  const s = vex();
  s.shield = 1;
  applyDamage(s, 3, 0);
  expect([s.shield, s.hp]).toEqual([0, 4]);
});
test("hit grants 500 ms invulnerability", () => {
  const s = vex();
  applyDamage(s, 1, 0);
  expect(applyDamage(s, 1, 499).ignored).toBe(true);
  expect(applyDamage(s, 1, 500).ignored).toBe(false);
});
test("grantInvuln never shortens", () => {
  const s = vex();
  grantInvuln(s, 0, 800);
  grantInvuln(s, 0, 200);
  expect(s.invulnUntil).toBe(800);
});
test("hit during a longer dash window keeps the dash window", () => {
  const s = vex();
  grantInvuln(s, 0, 200);
  expect(applyDamage(s, 1, 100).ignored).toBe(true);
  expect(applyDamage(s, 1, 200).ignored).toBe(false);
  expect(s.invulnUntil).toBe(700);
});
test("death happens once and hp never negative", () => {
  const s = vex();
  expect(applyDamage(s, 99, 0).died).toBe(true);
  expect(s.hp).toBe(0);
  expect(applyDamage(s, 1, 10_000)).toMatchObject({ ignored: true, died: false });
});
test("regen waits 3 s then +1/s", () => {
  const s = vex();
  applyDamage(s, 2, 0);
  expect(tickShieldRegen(s, 2999)).toBe(0);
  expect(tickShieldRegen(s, 3000)).toBe(1);
  expect(tickShieldRegen(s, 3999)).toBe(0);
  expect(tickShieldRegen(s, 4000)).toBe(1);
});
test("long gap regenerates whole seconds only, capped at max", () => {
  const s = vex();
  s.shield = 0;
  s.lastDamagedAt = 0;
  s.nextRegenAt = 3000;
  expect(tickShieldRegen(s, 5500)).toBe(3);
  expect(tickShieldRegen(s, 60_000)).toBe(1);
  expect(s.shield).toBe(4);
});
test("spendEnergy is all-or-nothing", () => {
  const s = vex();
  s.energy = 2;
  expect(spendEnergy(s, 3)).toBe(false);
  expect(s.energy).toBe(2);
  expect(spendEnergy(s, 2)).toBe(true);
  expect(s.energy).toBe(0);
});
test("heal and gainEnergy cap at max", () => {
  const s = vex();
  s.hp = 5;
  s.energy = 170;
  expect(heal(s, 3)).toBe(1);
  expect(gainEnergy(s, 50)).toBe(10);
  expect([s.hp, s.energy]).toEqual([6, 180]);
});
test("dead combatant cannot be healed", () => {
  const s = vex();
  applyDamage(s, 99, 0);
  expect(heal(s, 2)).toBe(0);
});
