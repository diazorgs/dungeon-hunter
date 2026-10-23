# 21 · Story and Narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The light narrative layer: Ops radio lines and VIGIL warnings at every PRD story beat, Ops signal degradation in Sector 3, nine collectible Vault Logs that carry the twist, and the text for intro and ending cards (rendered by plan 22).

**Architecture:** All copy is data in `@dh/shared` (`radio.json`, `logs.json`, `cards.json`). A `NarrativeDirector` in the dungeon maps scene events to beats and sends lines to the HUD `RadioBox` and a `VigilBanner`. Log selection and text degradation are pure.

**Tech Stack:** TypeScript, Phaser 4 HUD widgets from plan 11.

**Milestone:** M5 · **Depends on:** 11, 19, 20 · **Spec:** PRD "Story and world", "Story beats in a run", "Vault Logs", "Rule: story text never pauses combat"; `DESIGN.md` §12

## Global Constraints

- Story text never pauses combat. Radio lines appear in the small bottom box and fade on their own.
- Characters: the Runner (unit number per run, "Runner Unit 047" style), Ops (handler), VIGIL (security system), Core Warden.
- Fixed strings from the PRD, verbatim: `INTRUDER DETECTED.`, `INTRUDER. SECTOR SEALED.`, results heading `Runner signal lost. Deploying next unit.`
- Vault Logs: 9 total, 3 per sector, 2 to 4 lines each; at most one log room per sector per run; the twist is told mainly in Sector 3 logs.
- Cut order #3: Vault Logs removable (`includeLog: false`), radio lines stay.

## Review Focus

- Beats fire once per run (re-entering Sector 1's start room does not replay the briefing); `s1-enter` plays only after the intro fade, not under the loading bar.
- A radio line queued while the player dies must not appear on top of the death transition (flush the queue on `run:ended`).
- With all 3 logs of a sector already collected, a log room still offers one (re-read), and it is not counted as new in `newLogIds`.
- Sector 3 degradation must keep lines readable: at most 25% of characters corrupted, never the first word.
- VIGIL banner on every combat-room lock could get spammy: show the full banner on the first lock per sector, then a short 0.6 s `SEALED.` flash.

## File Structure

```
packages/shared/src/data/radio.json, logs.json, cards.json
packages/shared/src/schemas/content.ts (CardSchema)
apps/web/src/game/
  logic/story/beats.ts, beats.test.ts
  logic/story/logs.ts, logs.test.ts
  logic/story/degrade.ts, degrade.test.ts
  systems/NarrativeDirector.ts
  hud/VigilBanner.ts
  entities/LogTerminal.ts
```

---

### Task 1: Write the copy

**Interfaces:**

- Produces:
  - `radio.json` beats (each 1–3 lines, ≤ 70 chars per line, speaker `ops` or `vigil`, `durationMs` 2500–4500): `s1-enter` (Ops briefing + VIGIL `INTRUDER DETECTED.`), `gatekeeper-dead` (Ops: path to the Conduit Works open), `s2-enter` (Ops notices the Bleed spreading in the machines), `hydra-dead` (VIGIL message glitches, first hint of the twist), `s3-enter` (Ops loses clarity), `core-chamber` (VIGIL speaks directly before the Warden wakes), `victory` (VIGIL's last clean message), `death` (Ops: signal lost), plus `vigil-sealed` = `INTRUDER. SECTOR SEALED.`
  - `logs.json`: 9 logs. Sector 1: facility history and the first anomalies. Sector 2: engineers noticing the Bleed in machines. Sector 3: VIGIL's own entries revealing that the Bleed reached VIGIL first and it now protects the corruption as the Core's "normal" state; shutting the Core down frees VIGIL.
  - `cards.json`: `intro` — 4 cards following the beats Veyra, the Vault, the malfunction, the Runner; `ending` — shutdown, VIGIL freed, Veyra's lights steady, then credits.
  - `CardSchema { id, art: string, lines: string[] (1–3) }`

- [ ] **Step 1: Test:** every beat in DESIGN.md §12 has ≥ 1 line; the three fixed PRD strings appear verbatim; 3 logs per sector with 2–4 lines; 4 intro cards.
- [ ] **Step 2:** → FAIL. **Step 3:** Write the copy (no Soul Knight names or references). **Step 4:** → PASS.
- [ ] **Step 5:** Commit `content: radio lines, vault logs, story cards`.

### Task 2: Beats, degradation and the NarrativeDirector

**Interfaces:**

- Produces:
  - `beatForEvent(e: { type: 'sector:entered'; sector: SectorId } | { type: 'boss:dead'; id: BossId } | { type: 'room:entered'; roomType: RoomType; sector: SectorId } | { type: 'run:death' }): string | null`
  - `class BeatLog { fire(beat: string): boolean /* false if already fired this run */ }`
  - `degradeText(text: string, level: 0 | 1 | 2, rng: Rng): string` (level 2 corrupts ≤ 25% of non-space characters after the first word with `#`, `/`, `_`)
  - `class NarrativeDirector { constructor(scene, radio: RadioBox, banner: VigilBanner, run: RunState) }` — Ops lines in Sector 3 pass through `degradeText(…, 2, rng)`; VIGIL lines after `hydra-dead` get a glitch flag that `RadioBox` renders with a 2-frame jitter.
  - `class VigilBanner { show(text: string, ms: number): void }` (top-centre, `bleed-300` on `ink`, scanline flicker)

- [ ] **Step 1: Tests:** `sector:entered 1` → `s1-enter`; `room:entered boss sector 3` → `core-chamber`; `BeatLog` returns false on the second fire; `degradeText` at level 0 returns the input; at level 2 keeps the first word and changes ≤ 25%; deterministic per rng.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement and wire to scene events; flush the RadioBox on `run:ended`. **Step 4:** → PASS.
- [ ] **Step 5: Verify manually:** play through Sector 1 and the Gatekeeper; lines appear at the right moments and never pause play.
- [ ] **Step 6:** Commit `feat(game): narrative director, vigil banner`.

### Task 3: Vault Log terminals (cut order #3)

**Interfaces:**

- Produces:
  - `pickLogForRoom(sector: SectorId, collected: readonly LogId[], foundThisRun: readonly LogId[], rng: Rng): LogId` (prefers uncollected, then not-found-this-run, then any of that sector)
  - `class LogTerminal` at the log room's `log` spawn point: E opens a non-pausing terminal panel (`teal-200` monospace-style text on `ink`, typewriter) and calls `addLog(run, id)`; HUD toast `VAULT LOG RECOVERED` on first read.

- [ ] **Step 1: Tests:** with none collected returns one of the sector's 3; with 2 collected returns the third; with all collected returns any of the sector's 3; never returns another sector's log.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5: Verify manually:** read a log; it appears in `RunSummary.newLogIds`; reading it again in the same run changes nothing.
- [ ] **Step 6:** Commit `feat(game): vault log terminals`.

## Acceptance

- [ ] Every PRD story beat appears in a full run, in order, without pausing combat.
- [ ] Three runs that each find a Sector 3 log reveal the twist without any other explanation.
