import { SEED_REGEX } from "@dh/utils";
import { z } from "zod";
import { SectorSchema } from "./content.ts";
import { LOG_IDS, RUNNER_IDS } from "./ids.ts";

const count = () => z.number().int().nonnegative();

export const RunResultSchema = z.object({
  runnerId: z.enum(RUNNER_IDS),
  seed: z.string().regex(SEED_REGEX),
  sectorReached: SectorSchema,
  roomsCleared: count(),
  bossesKilled: count().max(3),
  durationSec: count(),
  kills: count(),
  victory: z.boolean(),
  logsFound: z.array(z.enum(LOG_IDS)).max(3),
});

export type RunResult = z.infer<typeof RunResultSchema>;
