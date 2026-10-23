import { z } from "zod";

export const SettingsSchema = z.object({
  version: z.literal(1),
  musicVolume: z.number().min(0).max(1),
  sfxVolume: z.number().min(0).max(1),
  aimMode: z.enum(["soft", "full"]),
  screenShake: z.number().min(0).max(1),
  damageNumbers: z.boolean(),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  aimMode: "soft",
  screenShake: 1,
  damageNumbers: false,
};
