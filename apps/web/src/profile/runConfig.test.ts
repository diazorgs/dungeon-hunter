import { DEFAULT_SETTINGS } from "@dh/shared";
import { isValidSeed } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { buildRunConfig } from "./runConfig.ts";
import { DEFAULT_PROFILE } from "./types.ts";
import type { Profile } from "./types.ts";

const owned: Profile = {
  ...DEFAULT_PROFILE,
  unlocks: [
    { itemType: "weapon", itemId: "null-cannon" },
    { itemType: "mod", itemId: "dash-coil" },
    { itemType: "runner", itemId: "kit" },
  ],
  vaultLogs: ["s1-log-2"],
  stats: { totalRuns: 4, totalVictories: 0, bestVictorySec: null },
};

test("unlocks are split by item type", () => {
  const c = buildRunConfig(owned, "kit", DEFAULT_SETTINGS, "ABCD1234");
  expect(c.unlockedWeaponIds).toEqual(["null-cannon"]);
  expect(c.unlockedModIds).toEqual(["dash-coil"]);
  expect(c.collectedLogIds).toEqual(["s1-log-2"]);
  expect(c.runnerId).toBe("kit");
  expect(c.firstRun).toBe(false);
});
test("firstRun and a generated seed for a new profile", () => {
  const c = buildRunConfig(DEFAULT_PROFILE, "vex", DEFAULT_SETTINGS);
  expect(c.firstRun).toBe(true);
  expect(isValidSeed(c.seed)).toBe(true);
});
test("Kit without the unlock falls back to Vex", () =>
  expect(buildRunConfig(DEFAULT_PROFILE, "kit", DEFAULT_SETTINGS).runnerId).toBe("vex"));
