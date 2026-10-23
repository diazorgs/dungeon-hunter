import type { z } from "zod";
import armoryJson from "./data/armory.json" with { type: "json" };
import bossesJson from "./data/bosses.json" with { type: "json" };
import guardiansJson from "./data/guardians.json" with { type: "json" };
import logsJson from "./data/logs.json" with { type: "json" };
import modsJson from "./data/mods.json" with { type: "json" };
import radioJson from "./data/radio.json" with { type: "json" };
import runnersJson from "./data/runners.json" with { type: "json" };
import weaponsJson from "./data/weapons.json" with { type: "json" };
import {
  ArmoryItemSchema,
  BossSchema,
  GuardianSchema,
  ModSchema,
  RadioLineSchema,
  RunnerSchema,
  VaultLogSchema,
  WeaponSchema,
} from "./schemas/content.ts";
import { BOSS_IDS, GUARDIAN_IDS, LOG_IDS, MOD_IDS, RUNNER_IDS, WEAPON_IDS } from "./schemas/ids.ts";
import type { ModId, WeaponId } from "./schemas/ids.ts";

function parseList<S extends z.ZodType>(file: string, schema: S, raw: unknown): z.infer<S>[] {
  const res = schema.array().safeParse(raw);
  if (!res.success) throw new Error(`Invalid content in data/${file}.json: ${res.error.message}`);
  return res.data;
}

/** Parses a JSON list and indexes it by id; every id in the tuple must appear exactly once. */
function byId<S extends z.ZodType<{ id: string }>, Id extends string>(
  file: string,
  schema: S,
  raw: unknown,
  ids: readonly Id[],
): Record<Id, z.infer<S>> {
  const list = parseList(file, schema, raw);
  const out = Object.fromEntries(list.map((item) => [item.id, item]));
  if (list.length !== ids.length || ids.some((id) => !(id in out)))
    throw new Error(`data/${file}.json ids do not match the id tuple`);
  return out as Record<Id, z.infer<S>>;
}

export const RUNNERS = byId("runners", RunnerSchema, runnersJson, RUNNER_IDS);
export const WEAPONS = byId("weapons", WeaponSchema, weaponsJson, WEAPON_IDS);
export const GUARDIANS = byId("guardians", GuardianSchema, guardiansJson, GUARDIAN_IDS);
export const BOSSES = byId("bosses", BossSchema, bossesJson, BOSS_IDS);
export const MODS = byId("mods", ModSchema, modsJson, MOD_IDS);
export const LOGS = byId("logs", VaultLogSchema, logsJson, LOG_IDS);
export const ARMORY = parseList("armory", ArmoryItemSchema, armoryJson);
export const RADIO = parseList("radio", RadioLineSchema, radioJson);

export const STARTER_WEAPON_POOL: WeaponId[] = WEAPON_IDS.filter((id) =>
  ["starter", "common"].includes(WEAPONS[id].rarity),
);
export const BASE_MOD_POOL: ModId[] = MOD_IDS.filter((id) => MODS[id].inBasePool);
