import { BASE_MOD_POOL, MODS, RUNNERS, modPool } from "@dh/shared";
import { createRng } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { deriveStats } from "../combat/stats.ts";
import { rollModChoices } from "./choices.ts";
import { onBossKilledEffects, thornDamage } from "./hooks.ts";

const base = deriveStats(RUNNERS.vex, []);

test("three distinct choices from the base pool", () => {
  const c = rollModChoices(createRng("m"), BASE_MOD_POOL, base);
  expect(c).toHaveLength(3);
  expect(new Set(c).size).toBe(3);
});
test("locked armory mods never appear", () => {
  const rng = createRng("lock");
  for (let i = 0; i < 200; i++)
    expect(rollModChoices(rng, modPool([]), base)).not.toContain("thorn-plating");
});
test("overclock core is not offered at 1 max HP", () => {
  const rng = createRng("hp1");
  const one = { ...base, maxHp: 1 };
  for (let i = 0; i < 200; i++)
    expect(rollModChoices(rng, BASE_MOD_POOL, one)).not.toContain("overclock-core");
});
test("same stream, same choices", () =>
  expect(rollModChoices(createRng("x").fork("mods:lift:s1"), BASE_MOD_POOL, base)).toEqual(
    rollModChoices(createRng("x").fork("mods:lift:s1"), BASE_MOD_POOL, base),
  ));
test("a pool of 2 offers 2", () =>
  expect(rollModChoices(createRng("two"), ["spare-cell", "dash-coil"], base)).toHaveLength(2));
test("field patch ×2 heals 2; no thorn plating deals 0", () => {
  expect(
    onBossKilledEffects(deriveStats(RUNNERS.vex, [MODS["field-patch"], MODS["field-patch"]])).heal,
  ).toBe(2);
  expect(thornDamage(["spare-cell"])).toBe(0);
  expect(thornDamage(["thorn-plating", "thorn-plating"])).toBe(2);
});
