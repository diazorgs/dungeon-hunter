import { expect, test } from "vite-plus/test";
import { createEnemyHealth, damageEnemy, isStunned, stun } from "./enemyHealth.ts";

test("elite and bleed hp multipliers", () => {
  expect(createEnemyHealth(8, 2).hp).toBe(16);
  expect(createEnemyHealth(6, 1.4).hp).toBe(8);
  expect(createEnemyHealth(1, 0.1).hp).toBe(1);
});
test("killed is reported exactly once", () => {
  const e = createEnemyHealth(6);
  expect(damageEnemy(e, 4)).toEqual({ dealt: 4, killed: false });
  expect(damageEnemy(e, 10)).toEqual({ dealt: 2, killed: true });
  expect(damageEnemy(e, 10)).toEqual({ dealt: 0, killed: false });
});
test("stun window", () => {
  const e = createEnemyHealth(6);
  stun(e, 1000, 500);
  expect(isStunned(e, 1499)).toBe(true);
  expect(isStunned(e, 1500)).toBe(false);
});
