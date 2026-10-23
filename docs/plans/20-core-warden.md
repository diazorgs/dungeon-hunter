# 20 · Core Warden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The final boss in the Core Chamber, three phases (Shielded, Lockdown, Core Exposed) with the 15% scream and enraged pattern, and the shutdown sequence that ends the run in victory. Closes M4: a complete offline run is winnable.

**Architecture:** On the plan 14 framework. Phase logic is pure (`logic/boss/warden.ts`): which phase, the Lockdown floor ring over time, and spiral cadence by HP. The entity composes shield arms (rotating blocker bodies), `HazardSystem` floor zones (plan 16) for Lockdown, and `EncounterSystem`-style waves of Bleed guardians.

**Tech Stack:** Phaser 4, TypeScript.

**Milestone:** M4 (gate, never cut) · **Depends on:** 14, 16, 19 · **Spec:** PRD "Core Warden", "Story beats" (Core Chamber, Victory); `DESIGN.md` §7.1, §11.6

## Global Constraints

- HP 1200. Phase thresholds: Shielded > 66%, Lockdown 66–33%, Core Exposed ≤ 33%; scream at 15%.
- Phase 1: 2 rotating shield arms block shots from the front; spiral patterns; players circle to hit the body.
- Phase 2: VIGIL seals arena edges (shrinking floor of electrified tiles) and the Warden summons 2 waves of Bleed guardians.
- Phase 3: arms break, Core visible; dense spirals, faster as HP drops; at 15% a 3-second scream telegraph, then a final enraged pattern.
- Win → shutdown sequence → `run:ended` with outcome `victory`. Target first-time win rate 10–20%.

## Review Focus

- The electrified floor must never cover the whole arena: a safe area of at least 7×5 tiles always remains, and the Warden's own position is excluded from blocking that space.
- Guardians summoned in Lockdown must spawn on safe tiles and be killable before the floor shrinks further; the Warden is invulnerable while a wave is alive.
- The scream (3 s) clears all enemy bullets and makes the Warden invulnerable; damage dealt during it is ignored, not banked.
- Player death during the shutdown sequence after the Warden dies does not happen: the player is invulnerable from `boss:dead` onward.
- Phase transitions triggered by a big hit (Null Cannon from 70% to 30%) must pass through Lockdown, not skip it: HP is clamped at each threshold until that phase's script has run.

## File Structure

```
apps/web/src/game/
  logic/boss/warden.ts, warden.test.ts
  entities/bosses/CoreWarden.ts, entities/bosses/ShieldArm.ts
  scenes/ShutdownSequence.ts            # in-dungeon cinematic, then run end
public/assets/tilemaps/rooms/core-chamber.json
```

---

### Task 1: Warden logic

**Interfaces:**

- Produces:
  - `WARDEN = { hp: 1200, thresholds: [0.66, 0.33], screamAt: 0.15, screamMs: 3000, lockdownRingEveryMs: 4000, maxRings: 2 }`
  - `type WardenPhase = 'shielded' | 'lockdown' | 'exposed' | 'scream' | 'enraged'`
  - `clampHpToGate(hp: number, maxHp: number, completedGates: ReadonlySet<number>): number` (HP cannot drop below a threshold whose phase has not completed)
  - `lockdownRings(elapsedMs: number): number` (0..2, +1 every 4 s)
  - `electrifiedTiles(arena: { w: number; h: number }, rings: number): { x: number; y: number }[]` (rings of the 13×9 floor inside the arena walls; at 2 rings the safe core is 9×5)
  - `spiralCadenceMs(hpPct: number): number` (lerp 140 ms at 33% → 70 ms at 0%)

- [ ] **Step 1: Tests:** a 900-damage hit from full HP clamps to `0.66 × 1200 = 792`; after gate 0.66 completes, the same hit clamps at 396; `lockdownRings(0) === 0`, `(4000) === 1`, `(60_000) === 2`; at 2 rings the safe region is exactly the central 9×5 block; `spiralCadenceMs(0.33) === 140`, `(0) === 70`.
- [ ] **Step 2:** `vp test src/game/logic/boss/warden.test.ts` → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): core warden phases`.

### Task 2: Phase 1 Shielded and Phase 3 Core Exposed

**Interfaces:**

- Produces: `class ShieldArm` (rotating static body on an orbit radius 28 px, blocks player bullets, sparks); `class CoreWarden extends Boss` registered as `core-warden`, steps:
  - Shielded: `spiral-2` (2-arm spiral, 3 s), `arm-sweep` (arms speed up for 2 s), arms rotate at 45°/s, facing biased toward the player so the front is always covered.
  - Exposed: arms break (debris particles, `ShieldArm` destroyed), `spiral-4` with `spiralCadenceMs(hpPct)`, `core-burst` (ring of 24 + aimed burst of 5).
  - Scream at 15%: invulnerable 3 s, clear enemy bullets, camera shake ramp, `bleed-100` flash pulses; then `enraged`: alternating `spiral-6` + `ring(32)` with cadence 70 ms until death.

- [ ] **Step 1:** Implement phases 1 and 3 with HP gating from Task 1.
- [ ] **Step 2: Verify** (`?scene=sandbox&spawn=boss:core-warden&god=1`): front shots spark off arms; circling hits the body; at 33% arms break; at 15% scream then enrage.
- [ ] **Step 3:** Commit `feat(game): core warden shielded and exposed phases`.

### Task 3: Phase 2 Lockdown

**Interfaces:**

- Consumes: `HazardSystem.spawn('floor', …)`, `GuardianSystem.spawn(…, { bleed: true })`, `buildWaves`.
- Produces: Lockdown script — at 66%: Warden invulnerable, VIGIL banner "LOCKDOWN. ARENA SEALED.", floor rings electrify every 4 s (telegraph 1 s before each ring), wave 1 (`buildWaves(14, sector-3 pool, rng, { bleed: true })`'s first wave); on clear, Warden vulnerable with `spiral-2` until 50%; wave 2 at 50%; after wave 2 clears, vulnerable until 33%; floor clears at phase 3 start.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify:** the safe core is always reachable; guardians spawn on safe tiles; a Null Cannon burst from 70% stops at 66% and Lockdown still plays.
- [ ] **Step 3:** Commit `feat(game): core warden lockdown phase`.

### Task 4: Shutdown sequence and the M4 gate

**Interfaces:**

- Produces: `ShutdownSequence.play(scene): Promise<void>` — player invulnerable and input locked, Core implodes (white flash, slow-mo), VIGIL's last clean message line (radio beat `victory`, text in plan 21), fade to `bone`; then `onBossKilled(run, 'core-warden')` (sets victory) and `bus.emit('run:ended', toRunSummary(run))`.

- [ ] **Step 1:** Implement; arena `core-chamber.json` (round-ish chamber, no cover, central Core spawn).
- [ ] **Step 2: Playtest** with 3–5 people from a fresh run: record outcome, sector of death, time, Warden attempts in `docs/playtests/m4-full-run.md`. Tune `bosses.json` / `guardians.json` so a first-time player can win (one tester ideally wins within three runs).
- [ ] **Step 3:** Verify `RunSummary` from a real victory passes `validateRun` and pays 2×rooms + 50 + 100.
- [ ] **Step 4:** Commit `feat(game): shutdown sequence; m4 playtest`.

## Acceptance (M4 gate)

- [ ] A complete offline run (3 sectors, Gatekeeper, Hydra, Warden) is winnable, start to victory, with no DEV flags.
- [ ] All three Warden phases, the scream and the enraged pattern appear in order.
