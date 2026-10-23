# 24 · Backend: Database and Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Local Supabase with the MVP schema locked down by RLS, generated DB types, and Hono auth: register, login, logout, and a session middleware based on httpOnly cookies.

**Architecture:** Supabase is reachable only from the API with the secret key (bypasses RLS); RLS is on with zero policies so the public keys can do nothing. Route handlers depend on a small `Repo` interface, so tests run against an in-memory fake with `app.request()` and never need Docker. A separate integration check script verifies RLS against the real local DB.

**Tech Stack:** Supabase CLI + Postgres, `@supabase/supabase-js` 2, Hono 4 on Cloudflare Workers, `@hono/zod-validator`, Zod 4.

**Milestone:** M6 · **Depends on:** 02 (can run in parallel with M1–M5) · **Spec:** PRD "Technical architecture", "Data model", "API endpoints"; SETUP.md §4, §6, §10 Security; `DESIGN.md` §9, §13

## Global Constraints

- `apps/web` never imports Supabase or sees a key. The secret key lives only in `apps/api/.dev.vars` and Wrangler secrets; never `VITE_`-prefixed.
- Cookies: `dh_at` (access) and `dh_rt` (refresh), `HttpOnly; Secure; SameSite=Lax; Path=/api`. Never trust a user id from a request body.
- RLS enabled on every table, zero policies. One Supabase client per request.
- Before writing Supabase or Hono code, fetch current docs with `ctx7` (`/supabase/supabase-js` auth admin + sign-in; Hono cookie helpers and `zValidator`), per the project rule.

## Review Focus

- Register with a taken username must not leave an orphan auth user (create profile first-checked, or delete the auth user on profile insert failure).
- Expired access token + valid refresh token on any authed route must transparently refresh and rewrite both cookies; invalid refresh clears cookies and returns 401.
- Login error messages must not reveal whether an email exists (`INVALID_CREDENTIALS` for both).
- Email case and whitespace (`" Foo@Bar.com "`) normalise before create/login.
- `Secure` cookies on `http://localhost` dev: browsers accept Secure on localhost; verify with the Vite proxy, and keep `Secure` on.

## File Structure

```
supabase/config.toml, supabase/migrations/<ts>_init.sql
package.json (root scripts: db:start, db:stop, db:reset, db:types)
packages/shared/src/db.types.ts            # generated
apps/api/src/
  env.ts
  db/repo.ts                                # Repo interface
  db/supabaseRepo.ts                        # real implementation
  db/memoryRepo.ts                          # test fake
  auth/cookies.ts, auth/session.ts          # middleware
  routes/auth.ts, routes/auth.test.ts
  errors.ts
apps/api/scripts/check-rls.ts
```

---

### Task 1: Supabase project, schema and RLS lockdown

- [ ] **Step 1:** `pnpm add -Dw supabase`; `pnpm exec supabase init`; root scripts `"db:start": "supabase start"`, `"db:stop": "supabase stop"`, `"db:reset": "supabase db reset"`, `"db:types": "supabase gen types typescript --local > packages/shared/src/db.types.ts"`.
- [ ] **Step 2:** Migration `init`: tables from SETUP.md §6 plus `profiles.imported_guest boolean not null default false`, `profiles.username` check `~ '^[a-z0-9_]{3,16}$'`, index `runs (profile_id, created_at desc)`, index `runs (victory, duration_sec) where victory`, RLS enabled on all five tables, and `revoke all on all tables in schema public from anon, authenticated;`.
- [ ] **Step 3:** `vp run db:reset && vp run db:types`. Exclude `db.types.ts` from lint/format.
- [ ] **Step 4:** `apps/api/scripts/check-rls.ts`: with the local **publishable/anon** key, `select` and `insert` on every table must return no rows / permission errors; exits non-zero otherwise. Run it. Expected: all denied.
- [ ] **Step 5:** Commit `feat(db): schema with rls lockdown`.

### Task 2: Repo interface and implementations

**Interfaces:**

- Produces:

```ts
interface Repo {
  createUser(email: string, password: string): Promise<{ userId: string } | { error: 'EMAIL_TAKEN' }>;
  deleteUser(userId: string): Promise<void>;
  signIn(email: string, password: string): Promise<Session | null>;
  refresh(refreshToken: string): Promise<Session | null>;
  verifyAccessToken(token: string): Promise<{ userId: string } | null>;
  createProfile(userId: string, username: string): Promise<{ ok: true } | { error: 'USERNAME_TAKEN' }>;
  // gameplay methods are added in plan 25
}
type Session = { accessToken: string; refreshToken: string; expiresAt: number; userId: string };
createSupabaseRepo(env: Bindings): Repo
createMemoryRepo(): Repo & { _users: Map<string, …> }   // tests only
```

- [ ] **Step 1:** Implement `supabaseRepo` with `auth.admin.createUser({ email, password, email_confirm: true })`, `auth.signInWithPassword`, `auth.refreshSession`, `auth.getUser(token)` (or `getClaims` if current docs recommend it), and table inserts; map Postgres unique violations to the error unions.
- [ ] **Step 2:** Implement `memoryRepo` with the same observable behaviour (tokens are random strings, access expiry configurable for tests).
- [ ] **Step 3:** Commit `feat(api): repo interface with supabase and memory implementations`.

### Task 3: Auth routes and session middleware

**Interfaces:**

- Consumes: `RegisterSchema`, `LoginSchema`, `ApiErrorSchema` (plan 02).
- Produces:
  - `createApp(makeRepo: (env: Bindings) => Repo)` returning the Hono app (default export uses `createSupabaseRepo`), so tests inject `memoryRepo`.
  - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` per DESIGN.md §9.1 (register/login respond with a minimal `{ profile: { id, username } }` until plan 25 returns full `MeResponse`)
  - `sessionMiddleware`: sets `c.var.userId`; refreshes when expired; 401 `UNAUTHORIZED` otherwise.
  - `apiError(c, status, code, message)` helper; `GET /api/session-check` (authed, returns `{ userId }`) used by tests only in DEV.

- [ ] **Step 1: Write failing tests** (`routes/auth.test.ts`, memory repo):

```ts
test("register sets both httpOnly cookies", async () => {
  const res = await post("/api/auth/register", {
    email: "a@b.co",
    password: "hunter22",
    username: "runner_47",
  });
  expect(res.status).toBe(200);
  const set = res.headers.getSetCookie().join(";");
  expect(set).toMatch(/dh_at=.*HttpOnly/);
  expect(set).toMatch(/dh_rt=.*HttpOnly/);
  expect(set).toMatch(/SameSite=Lax/);
});
test("duplicate username → 409 USERNAME_TAKEN and no orphan auth user", async () => {
  /* … repo._users.size unchanged */
});
test("login with wrong password and unknown email give identical errors", async () => {
  /* both 401 INVALID_CREDENTIALS */
});
test("email is trimmed and lowercased", async () => {
  /* register ' A@B.co ' then login 'a@b.co' */
});
test("expired access + valid refresh → 200 and rotated cookies", async () => {
  /* … */
});
test("no cookies → 401 UNAUTHORIZED", async () => {
  /* … */
});
test("logout clears cookies (Max-Age=0)", async () => {
  /* … */
});
test("body userId is ignored", async () => {
  /* session-check returns cookie user, not body */
});
```

- [ ] **Step 2:** `vp test` in `apps/api` → FAIL. **Step 3:** Implement with `hono/cookie` (`setCookie`, `getCookie`, `deleteCookie`) and `zValidator` (on failure respond `400 VALIDATION`). **Step 4:** → PASS.
- [ ] **Step 5: Verify against the real local DB:** `vp run db:start`, `vp run dev`, then register/login via `curl -c jar -b jar http://localhost:5173/api/auth/...`; rows appear in Studio; `check-rls.ts` still passes.
- [ ] **Step 6:** Commit `feat(api): auth routes and cookie session`.

## Acceptance

- [ ] Register, login, logout work through the Vite proxy with cookies only.
- [ ] RLS check script proves the public key can read or write nothing.
- [ ] API tests run without Docker.
