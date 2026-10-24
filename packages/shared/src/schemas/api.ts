import { z } from "zod";
import { ArmoryItemSchema } from "./content.ts";
import { LOG_IDS, RUNNER_IDS } from "./ids.ts";
import { SettingsSchema } from "./settings.ts";

const count = () => z.number().int().nonnegative();

export const ArmoryItemRefSchema = z.object({
  itemType: ArmoryItemSchema.shape.itemType,
  itemId: z.string().min(1).max(64),
});

// " Foo@Bar.com " and "foo@bar.com" are the same account.
const Email = z.string().trim().toLowerCase().pipe(z.email());

export const RegisterSchema = z.object({
  email: Email,
  password: z.string().min(8).max(128),
  username: z.string().regex(/^[a-z0-9_]{3,16}$/),
});

export const LoginSchema = z.object({
  email: Email,
  password: z.string().min(1).max(128),
});

const StatsSchema = z.object({
  totalRuns: count(),
  totalVictories: count(),
  bestVictorySec: count().nullable(),
});

export const MeResponseSchema = z.object({
  profile: z.object({ id: z.string(), username: z.string(), coreShards: count() }),
  unlocks: z.array(ArmoryItemRefSchema),
  vaultLogs: z.array(z.enum(LOG_IDS)),
  stats: StatsSchema,
  settings: SettingsSchema,
});

export const RunRewardSchema = z.object({
  shardsAwarded: count(),
  newLogIds: z.array(z.enum(LOG_IDS)),
  me: MeResponseSchema,
});

export const GuestImportSchema = z.object({
  coreShards: count().max(1000),
  unlocks: z.array(ArmoryItemRefSchema),
  vaultLogs: z.array(z.enum(LOG_IDS)),
  stats: StatsSchema,
});

export const LeaderboardQuerySchema = z.object({
  period: z.enum(["weekly", "all"]),
  kind: z.enum(["fastest", "deepest"]),
});

export const LeaderboardResponseSchema = z.object({
  entries: z.array(
    z.object({
      rank: z.number().int().positive(),
      username: z.string(),
      runnerId: z.enum(RUNNER_IDS),
      durationSec: count(),
      sectorReached: z.number().int().min(1).max(3),
      roomsCleared: count(),
      createdAt: z.string(),
    }),
  ),
});

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
export type RunReward = z.infer<typeof RunRewardSchema>;
export type GuestImport = z.infer<typeof GuestImportSchema>;
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
