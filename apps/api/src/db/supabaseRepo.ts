import { createClient } from "@supabase/supabase-js";
import type { Session as SbSession } from "@supabase/supabase-js";
import type { Bindings } from "../env.ts";
import type { Repo, Session } from "./repo.ts";

const UNIQUE_VIOLATION = "23505";

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
  };
}
