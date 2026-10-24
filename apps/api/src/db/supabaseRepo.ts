import { DEFAULT_SETTINGS, SettingsSchema } from "@dh/shared";
import type { ArmoryItemRef, LogId } from "@dh/shared";
import { createClient } from "@supabase/supabase-js";
import type { Session as SbSession } from "@supabase/supabase-js";
import type { Bindings } from "../env.ts";
import type { LeaderboardRow, Repo, Session } from "./repo.ts";

const UNIQUE_VIOLATION = "23505";

/** SQL functions `raise exception '<CODE>'`; anything else is a real failure. */
function raised<C extends string>(
  error: { message: string } | null,
  codes: readonly C[],
): C | null {
  if (!error) return null;
  const code = codes.find((c) => error.message.includes(c));
  if (code) return code;
  throw error;
}

/** Secret-key clients; one per call so a sign-in never leaks its session into another request. */
const client = (env: Bindings) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

const toSession = (s: SbSession): Session => ({
  accessToken: s.access_token,
  refreshToken: s.refresh_token,
  expiresAt: s.expires_at ?? Math.floor(Date.now() / 1000) + s.expires_in,
  userId: s.user.id,
});

export function createSupabaseRepo(env: Bindings): Repo {
  const db = client(env);
  return {
    async createUser(email, password) {
      const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error?.code === "email_exists" || error?.status === 422) return { error: "EMAIL_TAKEN" };
      if (error || !data.user) throw error ?? new Error("createUser returned no user");
      return { userId: data.user.id };
    },
    async deleteUser(userId) {
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    async signIn(email, password) {
      const { data, error } = await client(env).auth.signInWithPassword({ email, password });
      return error || !data.session ? null : toSession(data.session);
    },
    async signOut(accessToken) {
      // Revokes this session's refresh token, so a stolen dh_rt dies with the logout.
      await db.auth.admin.signOut(accessToken, "local");
    },
    async refresh(refreshToken) {
      const { data, error } = await client(env).auth.refreshSession({
        refresh_token: refreshToken,
      });
      return error || !data.session ? null : toSession(data.session);
    },
    async verifyAccessToken(token) {
      const { data, error } = await db.auth.getClaims(token);
      return error || !data?.claims.sub ? null : { userId: data.claims.sub };
    },
    async createProfile(userId, username) {
      const { error } = await db.from("profiles").insert({ id: userId, username });
      if (error?.code === UNIQUE_VIOLATION) return { error: "USERNAME_TAKEN" };
      if (error) throw error;
      return { ok: true };
    },

    async getMe(userId) {
      const [profile, unlocks, logs, save, stats] = await Promise.all([
        db.from("profiles").select("username, core_shards").eq("id", userId).single(),
        db.from("unlocks").select("item_type, item_id").eq("profile_id", userId),
        db.from("vault_logs").select("log_id").eq("profile_id", userId),
        db.from("saves").select("data").eq("profile_id", userId).eq("slot", 0).maybeSingle(),
        db.rpc("profile_stats", { p_profile: userId }).single(),
      ]);
      for (const r of [profile, unlocks, logs, save, stats]) if (r.error) throw r.error;
      const st = stats.data as {
        total_runs: number;
        total_victories: number;
        best_victory_sec: number | null;
      };
      const settings = SettingsSchema.safeParse(
        (save.data?.data as { settings?: unknown } | null)?.settings,
      );
      return {
        profile: {
          id: userId,
          username: profile.data!.username,
          coreShards: profile.data!.core_shards,
        },
        unlocks: (unlocks.data ?? []).map((u) => ({ itemType: u.item_type, itemId: u.item_id })),
        vaultLogs: (logs.data ?? []).map((l) => l.log_id as LogId),
        stats: {
          totalRuns: st.total_runs,
          totalVictories: st.total_victories,
          bestVictorySec: st.best_victory_sec,
        },
        settings: settings.success ? settings.data : DEFAULT_SETTINGS,
      };
    },
    async awardRun(userId, run, shards, newLogs) {
      const { data, error } = await db.rpc("award_run", {
        p_profile: userId,
        p_run: run,
        p_shards: shards,
        p_logs: newLogs,
      });
      const code = raised(error, ["RATE_LIMITED"] as const);
      return code ? { error: code } : { balance: data as number };
    },
    async purchase(userId, ref, cost) {
      const { data, error } = await db.rpc("purchase_unlock", {
        p_profile: userId,
        p_type: ref.itemType,
        p_id: ref.itemId,
        p_cost: cost,
      });
      const code = raised(error, ["INSUFFICIENT_SHARDS", "ALREADY_OWNED"] as const);
      return code ? { error: code } : { balance: data as number };
    },
    async importGuest(userId, d) {
      const { error } = await db.rpc("import_guest", {
        p_profile: userId,
        p_shards: d.coreShards,
        p_unlocks: d.unlocks satisfies ArmoryItemRef[],
        p_logs: d.vaultLogs,
        p_runs: d.stats.totalRuns,
        p_victories: d.stats.totalVictories,
        p_best_sec: d.stats.bestVictorySec,
      });
      const code = raised(error, ["IMPORT_USED"] as const);
      return code ? { error: code } : { ok: true };
    },
    async saveSettings(userId, settings) {
      const { error } = await db.from("saves").upsert({
        profile_id: userId,
        slot: 0,
        data: { version: 1, settings },
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    async leaderboard({ period, kind, limit }) {
      const { data, error } = await db.rpc("leaderboard", {
        p_period: period,
        p_kind: kind,
        p_limit: limit,
      });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map((r): LeaderboardRow => ({
        username: r.username as string,
        runnerId: r.runner_id as string,
        durationSec: r.duration_sec as number,
        sectorReached: r.sector_reached as number,
        roomsCleared: r.rooms_cleared as number,
        createdAt: r.created_at as string,
      }));
    },
  };
}
