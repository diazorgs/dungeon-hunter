import { expect, test } from "vite-plus/test";
import { ModEffectSchema } from "./content.ts";
import { DEFAULT_SETTINGS, SettingsSchema } from "./settings.ts";

test("settings require every field", () =>
  expect(SettingsSchema.safeParse({}).success).toBe(false));
test("default settings parse", () =>
  expect(SettingsSchema.parse(DEFAULT_SETTINGS)).toMatchObject({
    damageNumbers: false,
    screenShake: 1,
  }));
test("mod effect rejects unknown stat", () =>
  expect(ModEffectSchema.safeParse({ kind: "stat", stat: "luck", value: 1 }).success).toBe(false));
