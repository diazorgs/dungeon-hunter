import { expect, test } from "vite-plus/test";
import {
  ARMORY,
  BASE_MOD_POOL,
  GUARDIANS,
  LOGS,
  MODS,
  RUNNERS,
  SECTORS,
  STARTER_WEAPON_POOL,
  WEAPONS,
} from "./content.ts";
import { GUARDIAN_IDS, LOG_IDS, MOD_IDS, RUNNER_IDS, WEAPON_IDS } from "./schemas/ids.ts";

test.each([
  ["weapons", WEAPON_IDS, Object.keys(WEAPONS)],
  ["guardians", GUARDIAN_IDS, Object.keys(GUARDIANS)],
  ["mods", MOD_IDS, Object.keys(MODS)],
  ["runners", RUNNER_IDS, Object.keys(RUNNERS)],
  ["logs", LOG_IDS, Object.keys(LOGS)],
])("%s JSON ids match tuple", (_n, ids, keys) => expect([...keys].sort()).toEqual([...ids].sort()));

test("starter pool is pistol + 5 commons", () => {
  expect(STARTER_WEAPON_POOL).toHaveLength(6);
  expect(STARTER_WEAPON_POOL).toContain("rust-pistol");
});

test("base mod pool excludes the three armory mods", () => {
  expect(BASE_MOD_POOL).toHaveLength(7);
  for (const id of ["thorn-plating", "lucky-seal", "dash-coil"])
    expect(BASE_MOD_POOL).not.toContain(id);
});

test("every rare/epic weapon has an armory price (rare 80, epic 150)", () => {
  for (const w of Object.values(WEAPONS)) {
    const item = ARMORY.find((a) => a.itemType === "weapon" && a.itemId === w.id);
    if (w.rarity === "rare") expect(item?.cost).toBe(80);
    else if (w.rarity === "epic") expect(item?.cost).toBe(150);
    else expect(item).toBeUndefined();
  }
});

test("every armory item points at real content", () => {
  const known = { runner: RUNNERS, weapon: WEAPONS, mod: MODS };
  for (const a of ARMORY) expect(a.itemId in known[a.itemType]).toBe(true);
});

test("vex values match PRD", () =>
  expect(RUNNERS.vex).toMatchObject({ hp: 6, shield: 4, energy: 180 }));

test("logs: 3 per sector, 2–4 lines each", () => {
  for (const s of [1, 2, 3])
    expect(Object.values(LOGS).filter((l) => l.sector === s)).toHaveLength(3);
  for (const l of Object.values(LOGS)) {
    expect(l.lines.length).toBeGreaterThanOrEqual(2);
    expect(l.lines.length).toBeLessThanOrEqual(4);
  }
});

test("three sectors with the PRD names", () =>
  expect([1, 2, 3].map((id) => SECTORS[id as 1 | 2 | 3].name)).toEqual([
    "Storage Wing",
    "Conduit Works",
    "Core Approach",
  ]));
