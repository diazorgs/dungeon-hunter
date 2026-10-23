# 22 · React Screens and Local Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every React screen outside a run (Title, Intro cards, Staging Bay, Armory, Vault Logs, Leaderboard shell, Settings, Results, Ending, Auth shell), the pixel UI kit, and full guest meta progression in localStorage behind the `ProfileRepository` interface, so M5 ships the whole loop offline.

**Architecture:** Zustand holds client state (`screen`, settings, selected Runner). TanStack Query holds the profile, fetched and mutated only through `ProfileRepository` (DESIGN.md §8.1). This plan implements `LocalProfileRepository`; plan 25 adds `ApiProfileRepository` without touching screens. Tailwind tokens mirror `PALETTE`.

**Tech Stack:** React 19 (React Compiler on), Tailwind 4 `@theme`, Zustand 5, TanStack Query 5.

**Milestone:** M5 · **Depends on:** 02, 03, 12, 21 · **Spec:** PRD "Screens and UX flow", "Guest vs account", "Economy and meta progression"; `DESIGN.md` §8, §11.2–§11.4

## Global Constraints

- React owns every screen outside a run; `<PhaserGame>` is mounted only on the `run` screen.
- Guests play fully with progress in localStorage (`dh.profile.v1`, `dh.settings.v1`). Leaderboard requires an account.
- Payouts for guests use the same `computeShardPayout` + `validateRun` as the server.
- Every screen is keyboard-navigable with a visible focus ring; square-cornered pixel panels; sizes in multiples of 8 px.
- Wrap every `localStorage` read/write in try/catch; the game must run with storage blocked (progress then lasts for the session only, with a one-time notice).

## Review Focus

- Corrupt or older-version JSON in `dh.profile.v1` must migrate or reset to defaults without crashing the Title screen.
- Two tabs open: a purchase in tab A must not be overwritten by tab B's stale save (re-read before write; listen to the `storage` event to refresh the query).
- Double-clicking "Unlock" must not charge twice (mutation disabled while pending; repository re-checks with `checkPurchase`).
- Results screen after an `abandon` in the first 5 seconds still renders correctly (0 rooms, 0 shards, seed shown).
- Intro shows only on first launch; Ending only on first victory; both skippable with Esc/Enter/click.

## File Structure

```
apps/web/src/
  index.css                              # @theme tokens, @font-face
  ui/theme.test.ts                       # palette ↔ css token parity
  ui/components/PixelButton.tsx, Panel.tsx, Bar.tsx, Modal.tsx, Card.tsx, useMenuNav.ts
  ui/screens/TitleScreen.tsx, IntroScreen.tsx, StagingBayScreen.tsx, ArmoryScreen.tsx,
             VaultLogsScreen.tsx, LeaderboardScreen.tsx, SettingsScreen.tsx, ResultsScreen.tsx,
             EndingScreen.tsx, AuthScreen.tsx
  stores/session.ts, stores/settings.ts
  profile/types.ts, profile/repository.ts, profile/local.ts, profile/local.test.ts,
  profile/migrate.ts, profile/migrate.test.ts, profile/queries.ts, profile/runConfig.ts, profile/runConfig.test.ts
  app/AppRouter.tsx                       # replaces DevMenu
```

---

### Task 1: Theme tokens, font and UI kit

**Interfaces:**

- Produces: `@theme` CSS variables `--color-<token>` for all 32 palette tokens; `<PixelButton variant="primary|ghost" disabled>`, `<Panel title?>`, `<Bar value max colour>`, `<Modal open onClose>`, `<Card>`; `useMenuNav(count: number, opts: { columns?: number; onSelect(i): void; onBack?(): void }): { index: number; getItemProps(i) }` (arrow keys, Enter, Esc, gamepad D-pad via `navigator.getGamepads` poll while mounted).

- [ ] **Step 1: Test** `ui/theme.test.ts`: read `src/index.css` with `node:fs`, assert every `PALETTE` token appears as `--color-<token>: <toCss(value)>`.
- [ ] **Step 2:** → FAIL. **Step 3:** Write tokens, `@font-face` for the pixel font (`public/assets/fonts/ui.woff2`, licence in CREDITS.md; plan 23 may replace), components per DESIGN.md §11.4. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(ui): pixel theme tokens and ui kit`.

### Task 2: Profile model, migration and LocalProfileRepository

**Interfaces:**

- Produces:

```ts
interface Profile {
  version: 1; username: string | null; coreShards: number; unlocks: ArmoryItemRef[];
  vaultLogs: LogId[]; stats: { totalRuns: number; totalVictories: number; bestVictorySec: number | null };
  seenIntro: boolean; seenEnding: boolean;
}
interface RunReward { shardsAwarded: number; newLogIds: LogId[]; rejected?: RunRejectReason; profile: Profile }
interface ProfileRepository {                    // DESIGN.md §8.1
  load(): Promise<Profile>; submitRun(r: RunResult): Promise<RunReward>;
  purchase(ref: ArmoryItemRef): Promise<Profile>; saveSettings(s: Settings): Promise<void>;
  markSeen(flag: 'intro' | 'ending'): Promise<Profile>;
}
DEFAULT_PROFILE: Profile
migrateLocalProfile(raw: unknown): Profile
class LocalProfileRepository implements ProfileRepository { constructor(storage: Pick<Storage, 'getItem' | 'setItem'> | null) }
```

- [ ] **Step 1: Tests** (`local.test.ts` with an in-memory storage fake):
  - `load()` on empty storage returns `DEFAULT_PROFILE`; on garbage JSON returns defaults; `migrateLocalProfile({ version: 0, shards: 50 })` maps legacy fields or resets (pick reset; assert defaults).
  - `submitRun` with 5 rooms + Gatekeeper adds 35 shards, `totalRuns + 1`, stores new logs, returns them in `newLogIds`; a run failing `validateRun` adds 0 shards, still counts the run, and returns `rejected`.
  - Victory updates `totalVictories` and `bestVictorySec` only when faster.
  - `purchase` of kit at 299 throws `INSUFFICIENT_SHARDS`; at 300 deducts and adds the unlock; buying twice throws `ALREADY_OWNED`.
  - `storage: null` works in memory.
- [ ] **Step 2:** `vp test src/profile` → FAIL. **Step 3:** Implement (re-read storage before every write). **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(web): local profile repository`.

### Task 3: Settings store and query hooks

**Interfaces:**

- Produces: `useSettingsStore` (`settings: Settings`, `update(patch)`, persisted via repository `saveSettings`, defaults `DEFAULT_SETTINGS`); `ProfileRepositoryProvider` + `useRepository()`; hooks `useProfile()`, `useSubmitRun()`, `usePurchase()`, `useMarkSeen()` (TanStack Query, key `['profile']`, mutations `setQueryData` from the returned profile); `buildRunConfig(profile: Profile, runnerId: RunnerId, settings: Settings, seed?: string): RunConfig`.

- [ ] **Step 1: Tests** (`runConfig.test.ts`): unlocked weapons/mods come from `profile.unlocks` by `itemType`; `firstRun` is true when `stats.totalRuns === 0`; seed defaults to a valid generated seed; Kit is rejected when not unlocked (throws).
- [ ] **Step 2:** → FAIL. **Step 3:** Implement; `bus.on('settings:changed')` updates the store when the in-run pause menu changes settings. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(web): settings store and profile hooks`.

### Task 4: Screens

**Interfaces:**

- Produces: `screen` union `'title' | 'intro' | 'auth' | 'staging' | 'armory' | 'logs' | 'leaderboard' | 'settings' | 'run' | 'results' | 'ending'`; each screen a component under `ui/screens/`.

- [ ] **Step 1:** Title: logo text (working title), Play (→ intro on first launch, else staging), Continue as guest, Log in (→ auth shell: "Accounts arrive soon" until plan 25), Settings.
- [ ] **Step 2:** Intro: 4 cards from `cards.json` over pixel art placeholders; Enter/click advances, Esc skips; `markSeen('intro')`.
- [ ] **Step 3:** Staging Bay: Runner select (Vex; Kit locked with price), Core Shards counter, buttons to Armory, Vault Logs, Leaderboard, Settings, and **Start run** (`buildRunConfig` → `startRun`).
- [ ] **Step 4:** Armory: tabs Runners / Weapons / Mods from `ARMORY`; each card shows name, rarity colour, cost, owned state; Unlock calls `usePurchase` (button disabled while pending or unaffordable).
- [ ] **Step 5:** Vault Logs: 9 slots grouped by sector; collected ones readable, others `[ SIGNAL MISSING ]`.
- [ ] **Step 6:** Leaderboard: tabs Weekly / All-time × Fastest / Deepest; for guests a panel "Leaderboard requires an account" with a Log in button (data in plan 25).
- [ ] **Step 7:** Settings: music/SFX sliders, aim mode (Soft assist / Full auto-aim), screen shake slider (0–100%), damage numbers toggle, keybind reference table (PRD controls table, read-only).
- [ ] **Step 8:** Results: heading `Runner signal lost. Deploying next unit.` (death/abandon) or `CORE SHUTDOWN CONFIRMED` (victory); stats (sector reached, rooms cleared, bosses, kills, time, Scrap earned), Core Shards earned, seed (click to copy), new Vault Logs; buttons Staging Bay / Run again. On mount call `useSubmitRun` once with `summary.result` (guard against StrictMode double-call with a ref keyed by seed + duration).
- [ ] **Step 9:** Ending: on the first victory route Results → Ending (cards from `cards.json` + credits from `CREDITS.md` sections), `markSeen('ending')`.
- [ ] **Step 10: Verify manually:** full offline loop — first launch → intro → staging → run → die → results (shards added) → armory unlock a Rare weapon → next run's chest can drop it; reload the page, progress persists; block storage in devtools → game still runs with the notice.
- [ ] **Step 11:** Commit `feat(ui): all out-of-run screens`.

## Acceptance

- [ ] A guest can play, earn Core Shards, unlock something and see it in the next run, entirely offline.
- [ ] All screens keyboard-navigable; Lighthouse accessibility ≥ 90 on Title, Staging Bay, Settings.
