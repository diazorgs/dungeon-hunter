import type {
  ArmoryItemRef,
  LeaderboardQuery,
  LogId,
  MeResponse,
  RunResult,
  Settings,
} from "@dh/shared";

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  userId: string;
}

export interface LeaderboardRow {
  username: string;
  runnerId: string;
  durationSec: number;
  sectorReached: number;
  roomsCleared: number;
  createdAt: string;
}

export interface GuestImportData {
  coreShards: number;
  unlocks: ArmoryItemRef[];
  vaultLogs: LogId[];
  stats: { totalRuns: number; totalVictories: number; bestVictorySec: number | null };
}

/** Everything routes need from storage; tests swap in the memory implementation. */
export interface Repo {
  createUser(
    email: string,
    password: string,
  ): Promise<{ userId: string } | { error: "EMAIL_TAKEN" }>;
  deleteUser(userId: string): Promise<void>;
  signIn(email: string, password: string): Promise<Session | null>;
  /** Revokes the session behind this access token (logout). */
  signOut(accessToken: string): Promise<void>;
  refresh(refreshToken: string): Promise<Session | null>;
  verifyAccessToken(token: string): Promise<{ userId: string } | null>;
  createProfile(
    userId: string,
    username: string,
  ): Promise<{ ok: true } | { error: "USERNAME_TAKEN" }>;

  getMe(userId: string): Promise<MeResponse>;
  /** Atomic: stores the run and new logs and adds shards, or refuses inside 60 s of the last run. */
  awardRun(
    userId: string,
    run: RunResult,
    shards: number,
    newLogs: LogId[],
  ): Promise<{ balance: number } | { error: "RATE_LIMITED" }>;
  /** Atomic under a row lock: exactly one of two concurrent purchases can spend the same shards. */
  purchase(
    userId: string,
    ref: ArmoryItemRef,
    cost: number,
  ): Promise<{ balance: number } | { error: "INSUFFICIENT_SHARDS" | "ALREADY_OWNED" }>;
  importGuest(
    userId: string,
    data: GuestImportData,
  ): Promise<{ ok: true } | { error: "IMPORT_USED" }>;
  saveSettings(userId: string, s: Settings): Promise<void>;
  leaderboard(q: LeaderboardQuery & { limit: number }): Promise<LeaderboardRow[]>;
}
