# 25 · Backend: Gameplay API and Web Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The server side of meta progression (`GET /api/me`, `PUT /api/me/settings`, `POST /api/runs` with anti-cheat and server-computed payouts, `POST /api/armory/purchase`, `GET /api/leaderboard`, one-time guest import) and the web's `ApiProfileRepository`, login/register screens and leaderboard data. Closes M6.

**Architecture:** Routes validate with shared Zod schemas, call shared rules (`validateRun`, `computeShardPayout`, `checkPurchase`) and persist through the `Repo` interface from plan 24. Balance changes are atomic in Postgres functions (`award_run`, `purchase_unlock`) so concurrent requests cannot double-spend. The web swaps `LocalProfileRepository` for `ApiProfileRepository` when a session exists; screens do not change.

**Tech Stack:** Hono 4 + Hono RPC client (`hc<AppType>`), Zod 4, Supabase Postgres functions, TanStack Query.

**Milestone:** M6 (gate) · **Depends on:** 22, 24 · **Spec:** PRD "API endpoints", "Anti-cheat rules", "Guest vs account", "Leaderboard"; `DESIGN.md` §7.4, §8.1, §9, §13

## Global Constraints

- Client sends what happened, never shards. Server computes the payout.
- Reject per `validateRun`; additionally rate limit 1 accepted run per 60 s per account (`429 RATE_LIMITED`). Rejected runs are not stored (DESIGN.md D5).
- Leaderboard shows only stored (validated) runs; weekly = runs since Monday 00:00 UTC; one best entry per profile.
- Guest import: once per account, caps per DESIGN.md §13, values re-validated server-side.
- When the game talks to the API: app start (load profile), run end, Armory purchase, register/login. Nothing during combat.

## Review Focus

- Two simultaneous purchase requests with shards for only one must result in exactly one unlock (row lock / single SQL function).
- Two run submissions inside 60 s from two tabs: the second gets 429 and the profile is unchanged.
- A run submitted after the session expired mid-run must still succeed via refresh; if the refresh fails, the web keeps the `RunResult` in `sessionStorage` and retries after login (the result is not lost).
- Import after the account already has progress merges by max/union (shards: add capped imported value once), and a second import returns `409 IMPORT_USED`.
- Leaderboard with zero runs returns `{ entries: [] }`, not an error; usernames are the only personal data returned.

## File Structure

```
supabase/migrations/<ts>_gameplay.sql      # award_run, purchase_unlock, import_guest, leaderboard()
apps/api/src/
  db/repo.ts (+ gameplay methods), db/supabaseRepo.ts, db/memoryRepo.ts
  routes/me.ts, routes/runs.ts, routes/armory.ts, routes/leaderboard.ts (+ .test.ts each)
  index.ts                                  # mounts routes, exports AppType
apps/web/src/
  lib/api.ts
  profile/api.ts, profile/api.test.ts       # ApiProfileRepository
  profile/pendingRun.ts                     # sessionStorage retry
  ui/screens/AuthScreen.tsx, LeaderboardScreen.tsx (data), ImportPrompt.tsx
```

---

### Task 1: Gameplay SQL functions and Repo methods

**Interfaces:**

- Produces (SQL, `security definer` not needed since the API uses the secret key; still `revoke execute … from anon, authenticated`):
  - `award_run(p_profile uuid, p_run jsonb, p_shards int, p_logs text[]) returns int` — inserts the run, adds shards, inserts new logs (`on conflict do nothing`), returns the new balance; raises `RATE_LIMITED` if a run for the profile exists within 60 s (checked under `select … for update` on the profile row).
  - `purchase_unlock(p_profile uuid, p_type text, p_id text, p_cost int) returns int` — locks profile row, raises `INSUFFICIENT_SHARDS` / `ALREADY_OWNED`, inserts unlock, deducts, returns balance.
  - `import_guest(p_profile uuid, p_shards int, p_unlocks jsonb, p_logs text[]) returns void` — raises `IMPORT_USED` when `imported_guest`; sets the flag.
  - `leaderboard(p_period text, p_kind text, p_limit int)` — `fastest`: victories ordered by `duration_sec` asc; `deepest`: by `sector_reached desc, rooms_cleared desc, duration_sec asc`; `distinct on (profile_id)` best row; joined username.
- Repo additions: `getMe(userId): Promise<MeResponse>`, `awardRun(userId, run, shards, newLogs)`, `purchase(userId, ref, cost)`, `importGuest(userId, data)`, `saveSettings(userId, s)` (upsert `saves` slot 0, `data: { version: 1, settings }`), `leaderboard(q)`; memory repo mirrors behaviour including the error codes.

- [ ] **Step 1:** Write the migration; `vp run db:reset && vp run db:types`; extend `check-rls.ts` to assert the anon key cannot `rpc` these functions.
- [ ] **Step 2:** Implement repo methods (map raised exceptions to the error unions).
- [ ] **Step 3: Verify:** a psql script runs two concurrent `purchase_unlock` calls for a 300-shard profile buying two 300-cost items; exactly one succeeds.
- [ ] **Step 4:** Commit `feat(db): atomic gameplay functions`.

### Task 2: /me, /runs, /armory, /leaderboard routes

**Interfaces:**

- Produces routes exactly as DESIGN.md §9.1; `POST /api/runs` returns `RunReward` (`shardsAwarded`, `newLogIds`, `me`); errors `422 RUN_REJECTED:<reason>`, `429 RATE_LIMITED`, `409 INSUFFICIENT_SHARDS | ALREADY_OWNED`, `404 UNKNOWN_ITEM`; register/login now return full `MeResponse`.

- [ ] **Step 1: Write failing tests** (memory repo, authed helper that registers and keeps the cookie jar):

```ts
test("GET /me returns zeroed profile for a new account", async () => {
  /* coreShards 0, unlocks [], settings default */
});
test("valid run pays server-computed shards; client shard fields are stripped", async () => {
  const res = await authed.post("/api/runs", { ...run5RoomsGatekeeper, shardsAwarded: 9999 });
  expect((await res.json()).shardsAwarded).toBe(35);
});
test.each(["ROOMS_EXCEED_SECTOR", "TOO_FAST_PER_ROOM", "VICTORY_TOO_FAST"])(
  "forged run %s → 422, nothing stored",
  async (r) => {
    /* … */
  },
);
test("second run within 60 s → 429", async () => {
  /* fake clock in memory repo */
});
test("purchase kit at 299 → 409 INSUFFICIENT_SHARDS; at 300 → unlock + balance 0", async () => {
  /* … */
});
test("purchase starter weapon → 404 UNKNOWN_ITEM", async () => {
  /* … */
});
test("leaderboard empty → []; fastest lists victories only, one per profile", async () => {
  /* … */
});
test("weekly excludes runs before Monday 00:00 UTC", async () => {
  /* … */
});
test("PUT /me/settings persists and GET /me returns it", async () => {
  /* … */
});
```

- [ ] **Step 2:** `vp test` in `apps/api` → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(api): me, runs, armory, leaderboard routes`.

### Task 3: Guest import

**Interfaces:**

- Produces: `POST /api/me/import` with `GuestImportSchema`; server filters unlocks to known `ARMORY` items, logs to known `LOG_IDS`, caps shards at 1000; stats imported as `totalRuns`/`totalVictories` only when ≥ current (never decreases).

- [ ] **Step 1: Tests:** import of 5000 shards stores 1000; unknown unlock ids dropped silently; second import → 409 `IMPORT_USED`; existing unlocks are unioned.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(api): one-time guest import`.

### Task 4: Web integration

**Interfaces:**

- Consumes: `AppType` (type-only devDependency `@dh/api`), `ProfileRepository` (plan 22).
- Produces:
  - `lib/api.ts`: `export const api = hc<AppType>('/', { init: { credentials: 'include' } })`
  - `class ApiProfileRepository implements ProfileRepository` mapping `MeResponse` ↔ `Profile` (`seenIntro`/`seenEnding` stay local per device); maps API error codes to thrown `ProfileError { code }`.
  - `useSessionStore.authMode` switches repositories; on app start `GET /api/me` decides (`200` → account, `401` → guest).
  - `pendingRun.ts`: `savePendingRun(r)`, `takePendingRun()`; `useSubmitRun` saves before calling and clears on success or definitive `422`.
  - Auth screen: Register (email, password, username) and Log in forms with inline errors from codes; after register, if the local profile has progress, show `ImportPrompt` (import once / skip).
  - Leaderboard screen fetches `GET /api/leaderboard` for both tabs (TanStack Query, 60 s stale time).

- [ ] **Step 1: Tests** (`profile/api.test.ts` with a mocked `fetch`): `load()` maps `MeResponse` to `Profile`; a `422` from `submitRun` becomes `ProfileError('RUN_REJECTED:TOO_FAST_PER_ROOM')`; a pending run is replayed once after login.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5: Verify manually (M6 gate):** register → play → shards credited → clear site data in devtools → log in again → shards, unlocks, logs and settings are back; in devtools console, `fetch('/api/runs', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...validRun, roomsCleared: 18, sectorReached: 1 }) })` → 422 and no balance change.
- [ ] **Step 6:** Commit `feat(web): api profile repository, auth screens, leaderboard data, guest import`.

## Acceptance (M6 gate)

- [ ] Core Shards survive a browser wipe.
- [ ] A forged run submission is rejected (422) and leaves no trace on the leaderboard.
- [ ] Concurrent purchases cannot overspend.
