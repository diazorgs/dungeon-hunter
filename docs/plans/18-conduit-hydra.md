# 18 · Conduit Hydra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Sector 2 boss: a core with three cable heads, each firing a different pattern (aimed shots, spread, beam sweep). Destroying a head removes its pattern; the core becomes vulnerable after all three fall.

**Architecture:** A multi-part boss on the plan 14 framework. `ConduitHydra` owns three `HydraHead` hit targets (child sprites with their own `EnemyHealth`) and routes `takeHit(…, part)`. Which heads attack is pure scheduling over the set of living heads (`logic/boss/hydra.ts`). The beam sweep reuses the Pulse Lance raycast helper from plan 17 in enemy form.

**Tech Stack:** Phaser 4, TypeScript.

**Milestone:** M4 · **Depends on:** 14 (and 17 for the shared raycast helper) · **Spec:** PRD "Conduit Hydra"; `DESIGN.md` §7.1, §11.6

## Global Constraints

- Heads: `aimer` (aimed shots), `spreader` (spread), `sweeper` (beam sweep). HP 150 each; core 300 (total 750, `bosses.json`).
- Core invulnerable (bullets spark off it) until all heads are destroyed.
- Each attack telegraphed ≥ 400 ms; beam sweep shows its full arc before firing.
- The boss bar shows total remaining HP across living parts, with markers where each head's share ends.

## Review Focus

- Killing a head mid-attack cancels that head's attack immediately and clears only that head's live projectiles (and its beam).
- The last head's death and the core becoming vulnerable must happen in the same frame (no window where nothing is hittable and nothing attacks forever).
- Explosive and chain damage hitting several parts at once must apply to each part separately and not damage the invulnerable core.
- Sweeper beam must be blocked by nothing (it is the arena hazard) but must respect player i-frames.
- With two heads dead, the remaining head speeds up (attack cadence × 0.8) so the fight does not drag.

## File Structure

```
apps/web/src/game/
  logic/boss/hydra.ts, hydra.test.ts
  entities/bosses/ConduitHydra.ts, entities/bosses/HydraHead.ts
public/assets/tilemaps/rooms/boss-s2.json
```

---

### Task 1: Hydra scheduling logic

**Interfaces:**

- Produces:
  - `type HeadId = 'aimer' | 'spreader' | 'sweeper'`
  - `hydraSteps(alive: ReadonlySet<HeadId>, coreExposed: boolean): AttackStep[]` — one step per living head; cadence × 0.8 when one head remains; when `coreExposed`, steps become `core-pulse` (ring of 20) and `core-spiral` (3-arm spiral for 2 s).
  - `hydraBarMarkers(maxHp: { heads: number; core: number }): number[]` (fractions where each head segment ends: `[0.8, 0.6, 0.4]` for 150×3 + 300)

- [ ] **Step 1: Tests:** all three alive → three steps; `sweeper` dead → no `beam-sweep` step; one alive → its `recoverMs` is 0.8× the base; `coreExposed` returns only core steps; markers equal `[0.8, 0.6, 0.4]`.
- [ ] **Step 2:** `vp test src/game/logic/boss/hydra.test.ts` → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): hydra scheduling`.

### Task 2: ConduitHydra and heads

**Interfaces:**

- Consumes: `Boss`, `AttackScheduler`, `Telegraph`, patterns, enemy `BulletPool`.
- Produces: `class HydraHead extends Phaser.Physics.Arcade.Sprite { readonly headId: HeadId; health: EnemyHealth }`; `class ConduitHydra extends Boss` registered as `conduit-hydra`; scene event `hydra:head-destroyed { headId }`.
  - `aimer`: telegraph 450 ms, 5 aimed bolts 120 ms apart at 110 px/s.
  - `spreader`: telegraph 500 ms, 3 volleys of `spread(aim, 7, 70)` at 90 px/s.
  - `sweeper`: telegraph 700 ms (thin `bleed-500` line tracing the 120° arc), then a 1.5 s beam sweeping across that arc, 1 damage on contact.
  - Heads sway on cable tweens around the core; cables are decor (`teal-600` lines).

- [ ] **Step 1:** Implement; arena `boss-s2.json` (pipes and steam vents as decor, no cover inside the sweep radius).
- [ ] **Step 2: Verify manually** (`?scene=sandbox&spawn=boss:conduit-hydra`): each head's pattern disappears when it dies; the core sparks until the last head dies, then takes damage and switches to core patterns; fight 90–150 s with a Rare weapon.
- [ ] **Step 3:** Commit `feat(game): conduit hydra`.

## Acceptance

- [ ] Hydra matches the PRD: three heads, three patterns, core vulnerable after all three.
