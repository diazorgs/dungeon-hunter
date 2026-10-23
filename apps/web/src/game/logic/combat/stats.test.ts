import { MODS, RUNNERS } from "@dh/shared";
import { expect, test } from "vite-plus/test";
import { createCombatant } from "./combatant.ts";
import { applyStatChange, deriveStats } from "./stats.ts";

const vex = RUNNERS.vex;

test("no mods = runner base", () =>
  expect(deriveStats(vex, [])).toMatchObject({
    maxHp: 6,
    maxShield: 4,
    maxEnergy: 180,
    fireRateMul: 1,
    dashCharges: 1,
  }));
test("two cooling fins multiply", () =>
  expect(deriveStats(vex, [MODS["cooling-fins"], MODS["cooling-fins"]]).fireRateMul).toBeCloseTo(
    1.44,
  ));
test("overclock core: +25% damage, -1 max hp", () =>
  expect(deriveStats(vex, [MODS["overclock-core"]])).toMatchObject({ damageMul: 1.25, maxHp: 5 }));
test("maxHp never below 1", () =>
  expect(deriveStats(vex, Array(6).fill(MODS["overclock-core"])).maxHp).toBe(1));
test("spare cell raises current shield too", () => {
  const s = createCombatant({ hp: 6, shield: 4, energy: 180 });
  s.shield = 2;
  applyStatChange(s, deriveStats(vex, []), deriveStats(vex, [MODS["spare-cell"]]));
  expect([s.shield, s.maxShield]).toEqual([3, 5]);
});
test("overclock at full hp clamps hp to new max", () => {
  const s = createCombatant({ hp: 6, shield: 4, energy: 180 });
  applyStatChange(s, deriveStats(vex, []), deriveStats(vex, [MODS["overclock-core"]]));
  expect([s.hp, s.maxHp]).toEqual([5, 5]);
});
test("hp never clamped to 0 while alive", () => {
  const s = createCombatant({ hp: 6, shield: 4, energy: 180 });
  s.hp = 1;
  const six = Array(6).fill(MODS["overclock-core"]);
  applyStatChange(s, deriveStats(vex, []), deriveStats(vex, six));
  expect(s.hp).toBe(1);
});
test("flags and hooks collected", () => {
  const st = deriveStats(vex, [MODS["ricochet-chip"], MODS["field-patch"], MODS["dash-coil"]]);
  expect(st.flags.has("bulletsBounce")).toBe(true);
  expect(st.hooks.onBossKilled[0]?.value).toBe(1);
  expect(st.dashCharges).toBe(2);
});
