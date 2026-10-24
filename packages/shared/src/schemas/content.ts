import { z } from "zod";
import { BOSS_IDS, GUARDIAN_IDS, LOG_IDS, MOD_IDS, RUNNER_IDS, WEAPON_IDS } from "./ids.ts";

const int = () => z.number().int();
const nonNeg = () => z.number().nonnegative();
export const SectorSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const RunnerSchema = z.object({
  id: z.enum(RUNNER_IDS),
  name: z.string(),
  title: z.string(),
  hp: int().positive(),
  shield: int().nonnegative(),
  energy: int().nonnegative(),
  skill: z.object({
    id: z.enum(["overcharge", "patch-drone"]),
    cooldownSec: z.number().positive(),
    durationSec: z.number().positive(),
  }),
  unlockCost: int().nonnegative(),
});

export const WEAPON_BEHAVIOURS = [
  "bullet",
  "pierce",
  "bounce",
  "explosive",
  "chain",
  "beam",
  "charge-orb",
  "melee-swing",
  "burst",
] as const;

export const WeaponSchema = z.object({
  id: z.enum(WEAPON_IDS),
  name: z.string(),
  type: z.string(),
  rarity: z.enum(["starter", "common", "rare", "epic"]),
  energyPerShot: int().nonnegative(),
  energyPerSecond: nonNeg().optional(),
  damage: nonNeg(),
  fireRate: nonNeg(),
  spreadDeg: nonNeg(),
  projectileSpeed: nonNeg(),
  pellets: int().positive(),
  behaviour: z.enum(WEAPON_BEHAVIOURS),
  behaviourParams: z.record(z.string(), z.union([z.number(), z.boolean()])),
  shake: z.object({ intensity: nonNeg(), durationMs: nonNeg() }),
  knockback: nonNeg(),
  sfx: z.string(),
  sprite: z.string(),
});

export const GuardianSchema = z.object({
  id: z.enum(GUARDIAN_IDS),
  name: z.string(),
  sectorMin: SectorSchema,
  hp: int().positive(),
  speed: nonNeg(),
  contactDamage: int().nonnegative(),
  budgetCost: int().positive(),
  ai: z.enum(["hover-shooter", "rusher", "turret", "shield", "spider", "mortar", "wraith"]),
  attack: z.record(z.string(), z.number()),
  scrap: int().nonnegative(),
  energyOrbChance: z.number().min(0).max(1),
});

export const BossSchema = z.object({
  id: z.enum(BOSS_IDS),
  name: z.string(),
  sector: SectorSchema,
  hp: int().positive(),
  phases: z.array(
    z.object({
      id: z.string(),
      untilHpPct: z.number().min(0).max(1),
      patterns: z.array(z.string()),
    }),
  ),
  /** Tunable numbers for the boss's attacks (speeds, timings, counts). */
  params: z.record(z.string(), z.number()).default({}),
});

export const ModEffectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stat"),
    stat: z.enum([
      "fireRateMul",
      "damageMul",
      "maxShield",
      "maxEnergy",
      "maxHp",
      "pickupRadiusMul",
      "dashCharges",
      "chestLuck",
    ]),
    value: z.number(),
  }),
  z.object({ kind: z.literal("flag"), flag: z.enum(["bulletsBounce", "thornContact"]) }),
  z.object({
    kind: z.literal("hook"),
    hook: z.literal("onBossKilled"),
    action: z.literal("heal"),
    value: z.number(),
  }),
]);

export const ModSchema = z.object({
  id: z.enum(MOD_IDS),
  name: z.string(),
  description: z.string(),
  inBasePool: z.boolean(),
  effects: z.array(ModEffectSchema).min(1),
});

export const ArmoryItemSchema = z.object({
  itemType: z.enum(["runner", "weapon", "mod"]),
  itemId: z.string(),
  cost: int().positive(),
});

export const RADIO_BEATS = [
  "intro",
  "s1-enter",
  "gatekeeper-dead",
  "s2-enter",
  "hydra-dead",
  "s3-enter",
  "core-chamber",
  "victory",
  "death",
  "vigil-sealed",
] as const;

export const RadioLineSchema = z.object({
  id: z.string(),
  beat: z.enum(RADIO_BEATS),
  speaker: z.enum(["ops", "vigil"]),
  text: z.string(),
  durationMs: int().positive(),
});

export const VendorPricesSchema = z.object({
  weaponPrice: z.object({
    common: int().positive(),
    rare: int().positive(),
    epic: int().positive(),
  }),
  health: z.object({ price: int().positive(), amount: int().positive() }),
  energy: z.object({ price: int().positive(), amount: int().positive() }),
});

export const SectorConfigSchema = z.object({
  id: SectorSchema,
  name: z.string(),
  tileset: z.string(),
  accent: z.string(),
  music: z.string(),
  bleedLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  radioEnterBeat: z.enum(RADIO_BEATS),
});

export const VaultLogSchema = z.object({
  id: z.enum(LOG_IDS),
  sector: SectorSchema,
  title: z.string(),
  lines: z.array(z.string()).min(2).max(4),
});

export const CardSchema = z.object({
  id: z.string(),
  art: z.string(),
  lines: z.array(z.string()).min(1).max(3),
});
export const CardsSchema = z.object({ intro: z.array(CardSchema), ending: z.array(CardSchema) });

export type Runner = z.infer<typeof RunnerSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type WeaponBehaviour = Weapon["behaviour"];
export type Guardian = z.infer<typeof GuardianSchema>;
export type Boss = z.infer<typeof BossSchema>;
export type ModEffect = z.infer<typeof ModEffectSchema>;
export type Mod = z.infer<typeof ModSchema>;
export type ArmoryItem = z.infer<typeof ArmoryItemSchema>;
export type RadioLine = z.infer<typeof RadioLineSchema>;
export type VaultLog = z.infer<typeof VaultLogSchema>;
export type SectorConfig = z.infer<typeof SectorConfigSchema>;
export type Card = z.infer<typeof CardSchema>;
export type VendorPrices = z.infer<typeof VendorPricesSchema>;
