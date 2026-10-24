import { ArmoryItemRefSchema, DEFAULT_SETTINGS, LOG_IDS, SettingsSchema } from "@dh/shared";
import type { Settings } from "@dh/shared";
import { z } from "zod";
import { DEFAULT_PROFILE } from "./types.ts";
import type { Profile } from "./types.ts";

const count = () => z.number().int().nonnegative();

const ProfileV1Schema = z.object({
  version: z.literal(1),
  username: z.string().nullable(),
  coreShards: count(),
  unlocks: z.array(ArmoryItemRefSchema),
  vaultLogs: z.array(z.enum(LOG_IDS)),
  stats: z.object({
    totalRuns: count(),
    totalVictories: count(),
    bestVictorySec: count().nullable(),
  }),
  seenIntro: z.boolean(),
  seenEnding: z.boolean(),
});

/** Only v1 exists; anything else (older, corrupt, hand-edited) resets to defaults. */
export function migrateLocalProfile(raw: unknown): Profile {
  const res = ProfileV1Schema.safeParse(raw);
  return res.success ? res.data : structuredClone(DEFAULT_PROFILE);
}

export function migrateSettings(raw: unknown): Settings {
  const res = SettingsSchema.safeParse(raw);
  return res.success ? res.data : { ...DEFAULT_SETTINGS };
}
