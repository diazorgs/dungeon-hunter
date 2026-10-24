import { DEFAULT_SETTINGS } from "@dh/shared";
import type { ArmoryItemRef, LogId, RunResult, Settings } from "@dh/shared";
import type { LeaderboardRow, Repo, Session } from "./repo.ts";

interface User {
  id: string;
  email: string;
  password: string;
}
interface StoredRun extends RunResult {
  at: number;
}
interface Profile {
  username: string;
  coreShards: number;
  importedGuest: boolean;
  imported: { runs: number; victories: number; bestSec: number | null };
  unlocks: ArmoryItemRef[];
  logs: LogId[];
  runs: StoredRun[];
  settings: Settings;
}

/** Monday 00:00 UTC of the week containing `ms`. */
export function weekStartUtc(ms: number): number {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

const RATE_LIMIT_MS = 60_000;

/** In-memory Repo for route tests, mirroring the SQL functions' behaviour; `clock` drives time. */
export function createMemoryRepo(opts: { accessTtlSec?: number } = {}) {
  const ttl = opts.accessTtlSec ?? 3600;
  const clock = { now: Date.now() };
  const users = new Map<string, User>();
  const profiles = new Map<string, Profile>();
  const access = new Map<string, { userId: string; exp: number }>();
  const refreshTokens = new Map<string, string>(); // token → userId

  const issue = (userId: string): Session => {
    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    const expiresAt = Math.floor(clock.now / 1000) + ttl;
    access.set(accessToken, { userId, exp: expiresAt });
    refreshTokens.set(refreshToken, userId);
    return { accessToken, refreshToken, expiresAt, userId };
  };
  const profile = (userId: string) => {
    const p = profiles.get(userId);
    if (!p) throw new Error(`no profile for ${userId}`);
    return p;
  };
  const owns = (p: Profile, ref: ArmoryItemRef) =>
    p.unlocks.some((u) => u.itemType === ref.itemType && u.itemId === ref.itemId);
  const addLogs = (p: Profile, logs: readonly LogId[]) => {
    for (const l of logs) if (!p.logs.includes(l)) p.logs.push(l);
  };

  const repo: Repo = {
    async createUser(email, password) {
      if ([...users.values()].some((u) => u.email === email)) return { error: "EMAIL_TAKEN" };
      const id = crypto.randomUUID();
      users.set(id, { id, email, password });
      return { userId: id };
    },
    async deleteUser(userId) {
      users.delete(userId);
    },
    async signIn(email, password) {
      const u = [...users.values()].find((x) => x.email === email && x.password === password);
      return u ? issue(u.id) : null;
    },
    async signOut(accessToken) {
      const a = access.get(accessToken);
      // Like Supabase: an expired JWT can't sign anything out.
      if (!a || a.exp <= clock.now / 1000) return;
      for (const [t, v] of access) if (v.userId === a.userId) access.delete(t);
      for (const [t, id] of refreshTokens) if (id === a.userId) refreshTokens.delete(t);
    },
    async refresh(token) {
      const userId = refreshTokens.get(token);
      if (!userId) return null;
      refreshTokens.delete(token); // rotation, like Supabase
      return issue(userId);
    },
    async verifyAccessToken(token) {
      const a = access.get(token);
      return a && a.exp > clock.now / 1000 ? { userId: a.userId } : null;
    },
    async createProfile(userId, username) {
      if ([...profiles.values()].some((p) => p.username === username))
        return { error: "USERNAME_TAKEN" };
      profiles.set(userId, {
        username,
        coreShards: 0,
        importedGuest: false,
        imported: { runs: 0, victories: 0, bestSec: null },
        unlocks: [],
        logs: [],
        runs: [],
        settings: DEFAULT_SETTINGS,
      });
      return { ok: true };
    },

    async getMe(userId) {
      const p = profile(userId);
      const wins = p.runs.filter((r) => r.victory).map((r) => r.durationSec);
      const best = [...wins, ...(p.imported.bestSec === null ? [] : [p.imported.bestSec])];
      return {
        profile: { id: userId, username: p.username, coreShards: p.coreShards },
        unlocks: p.unlocks.map((u) => ({ ...u })),
        vaultLogs: [...p.logs],
        stats: {
          totalRuns: p.runs.length + p.imported.runs,
          totalVictories: wins.length + p.imported.victories,
          bestVictorySec: best.length ? Math.min(...best) : null,
        },
        settings: { ...p.settings },
      };
    },
    async awardRun(userId, run, shards, newLogs) {
      const p = profile(userId);
      const last = p.runs.at(-1);
      if (last && clock.now - last.at < RATE_LIMIT_MS) return { error: "RATE_LIMITED" };
      p.runs.push({ ...run, at: clock.now });
      addLogs(p, newLogs);
      p.coreShards += shards;
      return { balance: p.coreShards };
    },
    async purchase(userId, ref, cost) {
      const p = profile(userId);
      if (owns(p, ref)) return { error: "ALREADY_OWNED" };
      if (p.coreShards < cost) return { error: "INSUFFICIENT_SHARDS" };
      p.unlocks.push({ itemType: ref.itemType, itemId: ref.itemId });
      p.coreShards -= cost;
      return { balance: p.coreShards };
    },
    async importGuest(userId, data) {
      const p = profile(userId);
      if (p.importedGuest) return { error: "IMPORT_USED" };
      p.importedGuest = true;
      for (const u of data.unlocks) if (!owns(p, u)) p.unlocks.push(u);
      addLogs(p, data.vaultLogs);
      p.coreShards += data.coreShards;
      const victories = p.runs.filter((r) => r.victory).length;
      p.imported = {
        runs: Math.max(0, data.stats.totalRuns - p.runs.length),
        victories: Math.max(0, data.stats.totalVictories - victories),
        bestSec: data.stats.bestVictorySec,
      };
      return { ok: true };
    },
    async saveSettings(userId, s) {
      profile(userId).settings = s;
    },
    async leaderboard({ period, kind, limit }) {
      const since = period === "weekly" ? weekStartUtc(clock.now) : -Infinity;
      const better = (a: StoredRun, b: StoredRun) =>
        kind === "fastest"
          ? a.durationSec - b.durationSec
          : b.sectorReached - a.sectorReached ||
            b.roomsCleared - a.roomsCleared ||
            a.durationSec - b.durationSec;
      const rows: (StoredRun & { username: string })[] = [];
      for (const p of profiles.values()) {
        const best = p.runs
          .filter((r) => r.at >= since && (kind === "deepest" || r.victory))
          .sort(better)[0];
        if (best) rows.push({ ...best, username: p.username });
      }
      return rows
        .sort(better)
        .slice(0, limit)
        .map((r): LeaderboardRow => ({
          username: r.username,
          runnerId: r.runnerId,
          durationSec: r.durationSec,
          sectorReached: r.sectorReached,
          roomsCleared: r.roomsCleared,
          createdAt: new Date(r.at).toISOString(),
        }));
    },
  };
  return Object.assign(repo, {
    _users: users,
    _profiles: profiles,
    _refreshTokens: refreshTokens,
    clock,
  });
}
