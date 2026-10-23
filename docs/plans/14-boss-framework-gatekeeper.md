# 14 · Boss Framework and Gatekeeper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reusable boss framework (phases by HP, telegraphed attack scheduling, bullet-pattern library, intro and death sequences, boss bar wiring) and the first boss, the Gatekeeper.

**Architecture:** Pattern geometry (rings, spreads, spirals) and phase selection are pure (`logic/boss/`). `entities/Boss.ts` is an abstract Phaser class; each boss subclasses it and declares phases as `AttackStep` sequences. Bullets come from the enemy `BulletPool`. Hydra and Warden (plans 18, 20) reuse everything here.

**Tech Stack:** Phaser 4, TypeScript.

**Milestone:** M3 · **Depends on:** 07, 08, 10 · **Spec:** `DESIGN.md` §7.1, §11.5, §11.6; PRD "Sector bosses" (Gatekeeper), "Combat feel checklist" (hit-stop)

## Global Constraints

- Every attack is telegraphed ≥ 400 ms (line, circle or flash in `bleed-500`).
- Hit-stop 30 ms on boss hits (rate-limited 120 ms) and on boss death (plan 08 JuiceSystem).
- Boss room is the dead end; doors lock on entry; the boss starts after a 1.5 s intro (name card + VIGIL banner).
- Gatekeeper: Pattern A charge → stuns itself on wall (damage window); Pattern B stationary bullet ring; below 50% HP charges twice in a row. HP 400.

## Review Focus

- The player dying during the boss death sequence still counts as death (outcome set by whichever happens first, guarded by `run.outcome`).
- Damage taken during the intro is zero for both sides (boss invulnerable, no attacks).
- A charge that never reaches a wall (player stands in a corner diagonal) must end after a max distance/time and still enter recovery.
- Crossing 50% HP mid-attack switches phase after the current step completes, not mid-charge.
- Boss bullets must be cleared from the pool when the boss dies (no unfair post-death hits).

## File Structure

```
apps/web/src/game/
  logic/boss/patterns.ts, patterns.test.ts
  logic/boss/phases.ts, phases.test.ts
  logic/boss/schedule.ts, schedule.test.ts
  entities/Boss.ts
  entities/bosses/Gatekeeper.ts
  systems/BossSystem.ts
  systems/Telegraph.ts
public/assets/tilemaps/rooms/boss-s1.json   # Gatekeeper arena (replaces placeholder)
```

---

### Task 1: Pattern geometry

**Interfaces:**

- Produces (angles in radians):
  - `ring(count: number, offset = 0): number[]`
  - `spread(aim: number, count: number, arcDeg: number): number[]`
  - `spiralStep(arms: number, step: number, stepDeg: number): number[]` (angles for one tick of a rotating spiral)
  - `aimedBurst(aim: number, count: number, jitterDeg: number, rand: () => number): number[]`

- [ ] **Step 1: Tests:** `ring(4)` ≈ `[0, π/2, π, 3π/2]`; `ring(4, π/4)` is offset; `spread(0, 3, 30)` ≈ `[-15°, 0, 15°]`; `spread(a, 1, x)` = `[a]`; `spiralStep(3, 1, 10)` = `ring(3)` rotated by 10°.
- [ ] **Step 2:** `vp test src/game/logic/boss` → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): bullet pattern geometry`.

### Task 2: Phases and attack scheduling

**Interfaces:**

- Produces:
  - `phaseIndex(hpPct: number, thresholds: readonly number[]): number` (thresholds descending, e.g. `[0.5]` → index 0 above 50%, 1 at/below)
  - `interface AttackStep { id: string; telegraphMs: number; runMs: number; recoverMs: number; weight: number }`
  - `class AttackScheduler { constructor(rng: Rng); setPhase(steps: readonly AttackStep[]): void /* takes effect after the current step */; update(now: number): { step: AttackStep; stage: 'telegraph' | 'run' | 'recover'; enteredAt: number; changed: boolean }; endStageEarly(now): void /* e.g. charge hit a wall */ }` — weighted pick, never the same step three times in a row.

- [ ] **Step 1: Tests:** `phaseIndex(0.5, [0.5]) === 1`; `phaseIndex(0.51, [0.5]) === 0`; scheduler stages advance at exact boundaries; `setPhase` mid-run applies only after the current step's recover; no step repeats 3× in 1000 picks with two equal-weight steps; `endStageEarly` moves `run` → `recover` immediately.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): boss phases and attack scheduler`.

### Task 3: Boss base, BossSystem and telegraphs

**Interfaces:**

- Consumes: `EnemyHealth`, `BulletPool` (enemy), `JuiceSystem.hitStop`, `EncounterSystem` door locking, `BossBar` events (plan 11).
- Produces:
  - `abstract class Boss extends Phaser.Physics.Arcade.Sprite { readonly id: BossId; health: EnemyHealth; invulnerable: boolean; damageTakenMul: number; abstract phases(): AttackStep[][]; abstract thresholds(): number[]; protected abstract runStep(step, stage, now, dt): void; takeHit(dmg, knockback, angle, now, part?: string): boolean }` (bosses ignore knockback; `takeHit` applies `damageTakenMul`; `part` routes hits on multi-part bosses, plan 18)
  - `class BossSystem { constructor(scene, player, enemyPool, juice); start(id: BossId, x, y): Boss; update(now, dt): void }` — intro 1.5 s (`boss:intro`, boss invulnerable), emits `boss:spawned { name, maxHp, phaseMarkers }`, `boss:hp`, on death: clear enemy bullets, hit-stop 30 ms + 600 ms slow-mo, explosion particles, `boss:dead { id, x, y }`, `onBossKilled(run, id)`.
  - `class Telegraph { line(from, angle, length, ms): void; circle(x, y, r, ms): void; flash(target, ms): void }` (`bleed-500`, 50% alpha pulse)
  - Registry `BOSSES_IMPL: Partial<Record<BossId, BossCtor>>`

- [ ] **Step 1:** Implement; boss room entry (from `EncounterSystem` when `type === 'boss'`) locks doors, then `BossSystem.start` at the arena's `boss` spawn point.
- [ ] **Step 2:** A sandbox `dummy` boss subclass (`?scene=sandbox&spawn=boss:dummy`) with one ring attack proves the pipeline.
- [ ] **Step 3: Verify manually:** intro card shows, boss bar fills, hits cause hit-stop at most every 120 ms, death clears bullets.
- [ ] **Step 4:** Commit `feat(game): boss framework`.

### Task 4: Gatekeeper

**Interfaces:**

- Produces: `class Gatekeeper extends Boss` with steps (starting values in `bosses.json` phase data):
  - `charge`: telegraph 600 ms (line toward player), run: 260 px/s straight; on wall collision `endStageEarly` → `stunned` recover 1500 ms with `damageTakenMul = 1.5` (otherwise 0.5: armoured); max run 1600 ms.
  - `ring`: telegraph 500 ms (body flash), run: 3 rings of 16 bullets at 80 px/s, 250 ms apart, each offset by 11.25°.
  - Phase 2 (≤ 50%): `double-charge` replaces `charge` (two charges, 350 ms between, second re-aims).

- [ ] **Step 1:** Implement; arena `boss-s1.json` (15×11, open floor, 4 pillar pairs as optional cover, `boss` spawn at centre-top).
- [ ] **Step 2: Verify manually** (`?scene=sandbox&spawn=boss:gatekeeper` and in a real sector): a skilled player can bait charges into walls; ring gaps are dodgeable; ≤ 50% double charge appears; fight lasts 60–120 s with the starter pistol + one common weapon.
- [ ] **Step 3:** Commit `feat(game): gatekeeper boss`.

## Acceptance

- [ ] Gatekeeper matches the PRD's three behaviours; every attack is telegraphed.
- [ ] Multi-part routing (`part` argument) is documented in `Boss.ts` for plan 18.
