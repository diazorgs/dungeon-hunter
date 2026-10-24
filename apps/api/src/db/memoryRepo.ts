import type { Repo, Session } from "./repo.ts";

interface User {
  id: string;
  email: string;
  password: string;
}

/** In-memory Repo for route tests. Same observable behaviour as Supabase; `clock` drives expiry. */
export function createMemoryRepo(opts: { accessTtlSec?: number } = {}) {
  const ttl = opts.accessTtlSec ?? 3600;
  const clock = { now: Date.now() };
  const users = new Map<string, User>();
  const usernames = new Map<string, string>(); // username → userId
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
      if (usernames.has(username)) return { error: "USERNAME_TAKEN" };
      usernames.set(username, userId);
      return { ok: true };
    },
  };
  return Object.assign(repo, { _users: users, _usernames: usernames, clock });
}
