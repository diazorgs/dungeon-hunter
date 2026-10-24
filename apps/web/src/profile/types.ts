import type { ArmoryItemRef, LogId, RunRejectReason, RunResult, Settings } from "@dh/shared";

export interface Profile {
  version: 1;
  username: string | null;
  coreShards: number;
  unlocks: ArmoryItemRef[];
  vaultLogs: LogId[];
  stats: { totalRuns: number; totalVictories: number; bestVictorySec: number | null };
  seenIntro: boolean;
  seenEnding: boolean;
}

export interface RunReward {
  shardsAwarded: number;
  newLogIds: LogId[];
  rejected?: RunRejectReason;
  profile: Profile;
}

/** DESIGN.md §8.1: screens and hooks only ever see this interface. */
export interface ProfileRepository {
  load(): Promise<Profile>;
  /** Settings live beside the profile (localStorage for guests, `saves` slot 0 for accounts). */
  loadSettings(): Promise<Settings>;
  submitRun(r: RunResult): Promise<RunReward>;
  purchase(ref: ArmoryItemRef): Promise<Profile>;
  saveSettings(s: Settings): Promise<void>;
  markSeen(flag: "intro" | "ending"): Promise<Profile>;
}

/** Stable codes from DESIGN.md §9.3, thrown by both repositories. */
export class ProfileError extends Error {
  readonly code: string;
  constructor(code: string, message = code) {
    super(message);
    this.code = code;
  }
}

export const DEFAULT_PROFILE: Profile = {
  version: 1,
  username: null,
  coreShards: 0,
  unlocks: [],
  vaultLogs: [],
  stats: { totalRuns: 0, totalVictories: 0, bestVictorySec: null },
  seenIntro: false,
  seenEnding: false,
};
