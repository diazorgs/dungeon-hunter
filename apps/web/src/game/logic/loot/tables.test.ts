import { GUARDIANS, WEAPON_IDS, WEAPONS } from "@dh/shared";
import { createRng } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { RARITY_WEIGHTS, rollChestWeapon, rollGuardianDrop } from "./tables.ts";

const ALL = [...WEAPON_IDS];
const freq = (luck: number) => {
  const rng = createRng(`chest${luck}`);
  const n = { common: 0, rare: 0, epic: 0, starter: 0 };
  for (let i = 0; i < 10_000; i++) n[WEAPONS[rollChestWeapon(rng, ALL, [], luck)].rarity]++;
  return n;
};

test("rarity frequencies follow the weights (±2%)", () => {
  const n = freq(0);
  for (const r of ["common", "rare", "epic"] as const)
    expect(Math.abs(n[r] / 10_000 - RARITY_WEIGHTS[r] / 100)).toBeLessThan(0.02);
  expect(n.starter).toBe(0);
});
test("luck raises rare frequency", () => expect(freq(1).rare).toBeGreaterThan(freq(0).rare));
test("a pool of only held weapons still returns one of them", () =>
  expect(rollChestWeapon(createRng("h"), ["rivet-smg"], ["rivet-smg"], 0)).toBe("rivet-smg"));
test("held weapons are avoided when possible", () => {
  const rng = createRng("avoid");
  for (let i = 0; i < 200; i++)
    expect(rollChestWeapon(rng, ["rivet-smg", "line-rifle"], ["rivet-smg"], 0)).toBe("line-rifle");
});
test("no epic without an unlocked epic", () => {
  const rng = createRng("noepic");
  const pool = ALL.filter((id) => WEAPONS[id].rarity !== "epic");
  for (let i = 0; i < 1000; i++)
    expect(WEAPONS[rollChestWeapon(rng, pool, [], 0)].rarity).not.toBe("epic");
});
test("elite always drops an orb", () => {
  const rng = createRng("elite");
  for (let i = 0; i < 200; i++)
    expect(rollGuardianDrop(rng, GUARDIANS.crawler, true).energyOrbs).toBeGreaterThanOrEqual(1);
});
test("same seed and order, same loot", () => {
  const roll = () => {
    const rng = createRng("same").fork("loot:s1");
    return [rollChestWeapon(rng, ALL, [], 0), rollChestWeapon(rng, ALL, [], 0)];
  };
  expect(roll()).toEqual(roll());
});
