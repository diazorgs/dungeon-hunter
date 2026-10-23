import type { LogId, ModId, RunResult, RunnerId, Settings, WeaponId } from "@dh/shared";

export interface RunConfig {
  runnerId: RunnerId;
  seed: string;
  unlockedWeaponIds: WeaponId[];
  unlockedModIds: ModId[];
  collectedLogIds: LogId[];
  settings: Settings;
  firstRun: boolean;
}

export interface RunSummary {
  result: RunResult;
  outcome: "victory" | "death" | "abandon";
  scrapEarned: number;
  newLogIds: LogId[];
}

export interface BridgeEvents {
  "run:ended": (summary: RunSummary) => void;
  "settings:changed": (s: Settings) => void;
}
