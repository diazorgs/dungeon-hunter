# 26 · Audio, Balance, Polish and Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the MVP: six music tracks and the final SFX set, a data-backed balance pass, performance and load-time verification, a 10+ person playtest, error reporting, and deployment of the API to Cloudflare Workers, the web to Cloudflare Pages and the database to Supabase cloud.

**Architecture:** No new systems. Music plugs into `AudioSystem.playMusic` (plan 08); React screens get a tiny `MenuMusic` wrapper using the same assets. Balance changes are JSON-only, guided by a DEV-only run telemetry log (local, never sent anywhere). Production serves `/api/*` on the same site as the web app so the `SameSite=Lax` cookies work.

**Tech Stack:** Phaser 4 sound, Wrangler, Cloudflare Pages, Supabase CLI, GitHub Actions.

**Milestone:** M7 (gate) · **Depends on:** all previous plans · **Spec:** PRD "Audio", "Risks and success metrics", M7 row, "Open question" (name); SETUP.md §11; `DESIGN.md` §11.7, §13

## Global Constraints

- Music: synth/chiptune with industrial percussion; tracks: lobby, sector 1, sector 2, sector 3, boss, Core Warden (6 total). Crossfade 800 ms.
- Every SFX pitch-randomized ±5% (already enforced by `AudioSystem`).
- Success metrics: 60 fps with 300 bullets on a mid-range laptop; first load < 5 s; average run 20–30 min; first-time Warden win rate 10–20%; ≥ 70% of playtesters start a second run unprompted; 0 crashes in 20 consecutive runs.
- No new features in M7 (PRD risk mitigation). Rename the public title before launch.

## Review Focus

- Music must respect `musicVolume: 0` immediately and survive tab blur/focus without double-playing.
- The production bundle must not contain `SandboxScene`, `window.__dh`, DEV keys (F6–F9), or the Supabase secret (grep the build output).
- Cold load on a throttled "Fast 4G" profile under 5 s: audio must stream/lazy-load per sector, not block the first screen.
- Wrangler production env must set `WEB_ORIGIN` to the real site; a mismatch silently breaks auth cookies.
- A crash (uncaught error) in Phaser must route to an error screen with "Return to Staging Bay", and the pending run result must not be lost (plan 25 `pendingRun`).

## File Structure

```
apps/web/public/assets/audio/music/{lobby,sector1,sector2,sector3,boss,warden}.ogg (+ .m4a)
apps/web/src/ui/MenuMusic.tsx
apps/web/src/app/ErrorBoundary.tsx, apps/web/src/game/errorHandler.ts
apps/web/src/game/logic/telemetry.ts, telemetry.test.ts      # DEV-only local run log
apps/api/wrangler.jsonc (env.production)
.github/workflows/deploy.yml
docs/playtests/m7-launch.md, docs/launch-checklist.md
```

---

### Task 1: Music and final SFX

**Interfaces:**

- Produces: music keys `music.lobby`, `music.sector1`, `music.sector2`, `music.sector3`, `music.boss`, `music.warden`; `DungeonScene` plays sector music on `sector:entered`, boss music on `boss:spawned` (Warden track for `core-warden`), back to sector music after `boss:dead`; `<MenuMusic track="music.lobby" />` in React screens via an `HTMLAudioElement` honouring `musicVolume`.

- [ ] **Step 1:** Commission or compose the 6 tracks (licence recorded in CREDITS.md); loop points clean; replace placeholder SFX with the final set (priority list in DESIGN.md §11.7).
- [ ] **Step 2:** Lazy-load: `preload` loads only lobby-independent SFX + current sector music; next sector music loads during the Lift interlude.
- [ ] **Step 3: Verify manually:** transitions crossfade; volume sliders apply live in menus and in the pause menu; alt-tab does not double-play.
- [ ] **Step 4:** Commit `audio: music and final sfx`.

### Task 2: Balance pass with local telemetry

**Interfaces:**

- Produces: `recordRunTelemetry(summary: RunSummary, extra: { deathRoomType?: RoomType; deathCause?: string; weaponsUsed: WeaponId[] }): void` writing to `localStorage['dh.telemetry.dev']` (DEV builds only; capped at 200 entries); `summarizeTelemetry(entries): { medianMinutes: number; winRate: number; deathsBySector: Record<SectorId, number>; deadliest: string[] }`; DEV-only "Telemetry" panel on the Staging Bay.

- [ ] **Step 1: Tests:** summary over fixture entries computes median, win rate, and per-sector deaths; recording is a no-op when `import.meta.env.PROD`.
- [ ] **Step 2:** → FAIL → implement → PASS. Commit `feat(dev): local run telemetry`.
- [ ] **Step 3:** Play ≥ 15 internal runs; tune JSON only (guardian HP/costs, `SECTOR_BASE`, boss HP, weapon damage/energy, Vendor prices, Armory prices) toward: run 20–30 min, Sector pacing 8/9/10 min, Warden first-time win 10–20%. Record each change and reason in `docs/playtests/m7-launch.md`.
- [ ] **Step 4:** Commit `balance: m7 pass`.

### Task 3: Performance, load time and crash handling

- [ ] **Step 1:** On the reference mid-range laptop: sandbox stress (300 bullets, 20 Bleed guardians, Sector 3 atmosphere) ≥ 58 fps sustained 60 s; record in the playtest doc. Fix by trimming filters/particles first.
- [ ] **Step 2:** `vp build`; check bundle: Phaser in its own chunk, React screens code-split from the game chunk (`lazy(() => import('./game/PhaserGame'))`); first screen interactive < 5 s on throttled Fast 4G (Chrome devtools).
- [ ] **Step 3:** `ErrorBoundary` for React; `errorHandler.ts` hooks `window.onerror`/`unhandledrejection` while a run is mounted → destroys the game and shows an error screen with "Return to Staging Bay"; pending run kept.
- [ ] **Step 4:** Grep the production build for `sandbox`, `__dh`, `SUPABASE_SECRET`. Expected: no matches.
- [ ] **Step 5:** Commit `perf: bundle split, crash screen, prod hygiene`.

### Task 4: Deploy

- [ ] **Step 1:** Supabase cloud: create project, `pnpm exec supabase link`, `pnpm exec supabase db push`; run `check-rls.ts` against cloud with the cloud publishable key → all denied.
- [ ] **Step 2:** API: `wrangler.jsonc` `env.production` with `name: dungeon-hunter-api`, route `<site>/api/*` (same site as the web app), `vars.WEB_ORIGIN`; `wrangler secret put SUPABASE_SECRET_KEY` and `SUPABASE_URL` for production; `pnpm --filter @dh/api deploy`.
- [ ] **Step 3:** Web: Cloudflare Pages, build `vp run @dh/web#build`, output `apps/web/dist`, `VITE_API_URL=/`.
- [ ] **Step 4:** `deploy.yml`: on tag `v*`, run `vp run ready`, then deploy API and web (Cloudflare API token in GitHub secrets). Ask the owner before the first production deploy.
- [ ] **Step 5: Verify on the public URL:** register, play to a death, shards credited, leaderboard reachable, cookies are `HttpOnly; Secure; SameSite=Lax`.
- [ ] **Step 6:** Commit `ci: production deploy`.

### Task 5: Launch playtest and checklist (M7 gate)

- [ ] **Step 1:** `docs/launch-checklist.md`: public name chosen and applied (title screen, `<title>`, README, credits), no Soul Knight assets or names, all CREDITS licences verified, success metrics table with measured values.
- [ ] **Step 2:** Playtest with 10+ people on the public URL; record run length, Warden win rate, whether they started a second run unprompted, any crash.
- [ ] **Step 3:** Run 20 consecutive full runs (mix of deaths and victories) on the public URL; 0 crashes required.
- [ ] **Step 4:** Commit `docs: launch checklist and m7 playtest`.

## Acceptance (M7 gate)

- [ ] Public URL live; no crash in 20 consecutive runs.
- [ ] Success-metric table filled with measured values; misses have an owner and a follow-up issue.
