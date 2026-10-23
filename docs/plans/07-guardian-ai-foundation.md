# 07 · Guardian AI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reusable guardian base (health, knockback, stun, contact damage, death), a small AI state machine keyed by `guardian.ai`, and the two M1 guardians: Sentry Drone and Crawler.

**Architecture:** Steering and decision math is pure (`logic/ai/`). `entities/Guardian.ts` holds `EnemyHealth` and delegates per-frame behaviour to an `AiController` chosen from a registry, mirroring the weapon behaviour registry. Stat modifiers (elite, Bleed) are applied at spawn through one `GuardianSpawnOpts` so plan 16 adds no new entity class.

**Tech Stack:** Phaser 4 Arcade Physics, TypeScript.

**Milestone:** M1 · **Depends on:** 04, 06 · **Spec:** `DESIGN.md` §4.4, §6, §7.1; PRD "Guardian machines", "Combat feel checklist"

## Global Constraints

- Guardian numbers only from `GUARDIANS`. Damage to the player goes through `applyDamage` (plan 04).
- Enemy bullets use the enemy `BulletPool` (plan 06).
- Hit feedback hooks emit `guardian:hit` / `guardian:killed` scene events; plan 08 renders the juice.
- Max 1 elite per room is enforced by the spawner (plan 10), not here.

## Review Focus

- A Crawler exploding in the same frame it is killed by the player must deal its explosion once (or not at all if killed first — rule: killed by player = no explosion damage, still plays the effect).
- Knockback must not push a guardian through walls (apply as velocity impulse, physics resolves).
- Stunned guardians stop moving and firing but still take damage and knockback.
- Guardians spawned overlapping a wall must be nudged to the nearest free tile (spawn points can be authored badly).
- A guardian whose target (player) is dead stops attacking and idles.

## File Structure

```
apps/web/src/game/
  logic/ai/steer.ts, steer.test.ts         # seek, flee, orbit, separation
  logic/ai/fsm.ts, fsm.test.ts             # tiny typed state machine
  entities/Guardian.ts
  systems/GuardianSystem.ts                # spawn, update, collisions, target provider for AimAssist
  systems/ai/AiController.ts, registry.ts, HoverShooterAi.ts, RusherAi.ts
```

---

### Task 1: Steering and state machine

**Interfaces:**

- Produces:
  - `seek(from: Vec2, to: Vec2, speed: number): Vec2`, `orbit(from, center, radius, speed, dir: 1 | -1): Vec2`, `separation(self: Vec2, others: readonly Vec2[], radius: number, strength: number): Vec2`
  - `createFsm<S extends string, C>(def: { initial: S; states: Record<S, { enter?(c: C, now: number): void; update(c: C, now: number, dt: number): S | void; exit?(c: C): void }> }): { state: S; enteredAt: number; update(c: C, now: number, dt: number): void; force(s: S, c: C, now: number): void }`

- [ ] **Step 1: Tests:** `seek` magnitude equals speed and is zero at the target; `orbit` result is perpendicular to the radius vector at exactly `radius`; `separation` pushes away from a neighbour inside radius and is zero outside; FSM calls `exit` then `enter` on transition, records `enteredAt`, ignores returning the current state.
- [ ] **Step 2:** `vp test src/game/logic/ai` → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(logic): steering and fsm`.

### Task 2: Guardian entity and system

**Interfaces:**

- Consumes: `EnemyHealth`, `damageEnemy`, `stun`, `BulletPool`, `Player`.
- Produces:
  - `GuardianSpawnOpts = { elite?: boolean; bleed?: boolean; hpMul?: number }`
  - `class Guardian extends Phaser.Physics.Arcade.Sprite { readonly def: Guardian; readonly uid: number; health: EnemyHealth; opts: GuardianSpawnOpts; takeHit(dmg: number, knockback: number, fromAngle: number, now: number, stunMs?: number): boolean /* killed */ }`
  - `class GuardianSystem { constructor(scene, player, enemyPool); spawn(id: GuardianId, x, y, opts?): Guardian; update(now, dt): void; aliveCount(): number; targets(): AimTarget[]; clear(): void }`
  - Scene events `guardian:hit { uid, x, y, dmg }`, `guardian:killed { uid, id, x, y, elite, bleed }`

- [ ] **Step 1:** Overlaps: player bullets ↔ guardians (`takeHit`, then pierce/kill bullet; skip if `bullet.hitIds.has(uid)`); guardians ↔ player contact (`contactDamage`); enemy bullets ↔ player (`applyDamage`, kill bullet). Dashing player ignores contact and bullets via `invulnUntil`.
- [ ] **Step 2:** Spawn nudge: if the spawn tile collides, BFS to the nearest free tile within 3 tiles.
- [ ] **Step 3:** Register `GuardianSystem.targets` as AimAssist's provider (plan 05).
- [ ] **Step 4:** Commit `feat(game): guardian entity and system`.

### Task 3: Sentry Drone and Crawler

**Interfaces:**

- Produces: `class HoverShooterAi` (`ai: 'hover-shooter'`) and `class RusherAi` (`ai: 'rusher'`) registered in `systems/ai/registry.ts`; attack params added to `guardians.json` `attack` field:
  - sentry-drone: `{ boltSpeed: 90, boltDamage: 1, fireEveryMs: 1800, preferredRange: 96, windupMs: 300 }`
  - crawler: `{ triggerRange: 18, fuseMs: 350, blastRadius: 20, blastDamage: 1 }`

- [ ] **Step 1:** Drone FSM: `drift` (orbit at preferredRange with separation) → `windup` (flash `bleed-300` 300 ms) → `fire` (one slow bolt at the player) → `drift`.
- [ ] **Step 2:** Crawler FSM: `chase` (seek at speed) → `fuse` (stop, blink, 350 ms) → `explode` (damage player if within radius, then die; emits `guardian:killed` with `selfDestruct: true`). Killed by the player before `explode` → no blast damage.
- [ ] **Step 3: Verify in sandbox** (`?scene=sandbox&spawn=crawler,crawler,sentry-drone`): drones keep distance and telegraph; crawlers rush and can be dodged with a dash; a dash through a blast takes no damage.
- [ ] **Step 4:** Commit `feat(game): sentry drone and crawler`.

## Acceptance

- [ ] 20 guardians + 300 bullets in sandbox at ≥ 58 fps.
- [ ] Both guardians teach their PRD lesson: "dodge and shoot back", "keep moving, prioritize threats" (checked in plan 08 playtest).
