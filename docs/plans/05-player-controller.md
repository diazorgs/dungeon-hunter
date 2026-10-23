# 05 · Player Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Runner that moves, dashes with i-frames, aims with soft or full aim assist, and uses a skill on right click / Space, starting with Vex's Overcharge.

**Architecture:** Aim-assist math and buffs are pure (`logic/combat/aim.ts`, `logic/combat/buffs.ts`). `entities/Player.ts` wraps an Arcade sprite and a `CombatantState`; `systems/SkillSystem.ts` runs skills implementing a small `Skill` interface so Kit's Patch Drone (plan 23) is one new class.

**Tech Stack:** Phaser 4 Arcade Physics, TypeScript.

**Milestone:** M1 · **Depends on:** 03, 04 · **Spec:** `DESIGN.md` §4.4, §4.6, §7.1, §7.2; PRD "Controls", "Aim assist", "Runners"

## Global Constraints

- Movement multiplies by `delta / 1000`. Move speed 96 px/s, acceleration time to full speed 60 ms, deceleration 80 ms.
- Dash: 48 px over 120 ms, 200 ms i-frames from dash start, `ChargePool(stats.dashCharges, 600)`.
- Soft assist: ±8°, cursor capture radius 24 px. Full auto-aim: nearest visible enemy ≤ 160 px.
- Body: 10×8 px at the Runner's feet (sprite 16×24), so walls clip feet, not heads.

## Review Focus

- Dashing into a wall stops at the wall without tunnelling (dash uses velocity on the physics body, not position teleport).
- Aim when the cursor sits exactly on the Runner (zero-length vector) keeps the previous angle.
- Soft assist with two enemies near the cursor picks the one closest to the cursor, not to the Runner.
- Skill pressed while on cooldown does nothing and shows no cooldown reset; pressing during pause does nothing.
- Full auto-aim ignores enemies behind walls (line-of-sight against the wall layer) and dead enemies.

## File Structure

```
apps/web/src/game/
  logic/combat/aim.ts, aim.test.ts
  logic/combat/buffs.ts, buffs.test.ts
  entities/Player.ts
  systems/AimAssist.ts          # gathers targets, calls logic
  systems/SkillSystem.ts
  systems/skills/Skill.ts, systems/skills/Overcharge.ts
```

---

### Task 1: Aim assist math

**Interfaces:**

- Produces:
  - `interface AimTarget { id: number; x: number; y: number; visible: boolean }`
  - `assistAngle(origin: Vec2, cursor: Vec2, targets: readonly AimTarget[], mode: 'soft' | 'full', prevAngle: number): number`
  - Constants `SOFT_ASSIST_MAX_DEG = 8`, `SOFT_CAPTURE_RADIUS = 24`, `FULL_AUTO_RANGE = 160`

- [ ] **Step 1: Write failing tests:**

```ts
const o = { x: 0, y: 0 };
test("no targets: aim at cursor", () =>
  expect(assistAngle(o, { x: 100, y: 0 }, [], "soft", 0)).toBeCloseTo(0));
test("cursor on origin keeps previous angle", () =>
  expect(assistAngle(o, o, [], "soft", 1.2)).toBe(1.2));
test("soft bends toward target near cursor, capped at 8°", () => {
  const a = assistAngle(o, { x: 100, y: 0 }, [{ id: 1, x: 100, y: 20, visible: true }], "soft", 0);
  expect(radToDeg(a)).toBeCloseTo(8, 1); // atan(20/100)=11.3° → capped
});
test("soft ignores targets beyond 24 px of cursor", () =>
  expect(
    assistAngle(o, { x: 100, y: 0 }, [{ id: 1, x: 100, y: 30, visible: true }], "soft", 0),
  ).toBeCloseTo(0));
test("soft prefers target closest to cursor", () => {
  /* targets at cursor+5 and cursor+15 → aims at +5 */
});
test("full aims at nearest visible within 160", () => {
  /* invisible nearer target skipped */
});
test("full falls back to cursor when none in range", () => {
  /* … */
});
```

- [ ] **Step 2:** `vp test src/game/logic/combat/aim.test.ts` → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(logic): aim assist`.

### Task 2: Timed buffs

**Interfaces:**

- Produces:
  - `type BuffId = 'overcharge'`; `interface ActiveBuffs { until: Partial<Record<BuffId, number>> }`
  - `addBuff(b: ActiveBuffs, id: BuffId, now: number, ms: number): void` (refreshes, does not stack)
  - `isActive(b, id, now): boolean`
  - `effectiveFireRateMul(stats: PlayerStats, b: ActiveBuffs, now: number): number` (`×2` under overcharge)
  - `effectiveEnergyCost(baseCost: number, b: ActiveBuffs, now: number): number` (0 under overcharge)

- [ ] **Step 1: Tests:** overcharge for 5000 ms at t=0 active at 4999, inactive at 5000; fire-rate mul with Cooling Fins (1.2) under overcharge = 2.4; energy cost 3 → 0 while active; re-adding at t=3000 extends to 8000.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): timed buffs`.

### Task 3: Player entity, movement and dash

**Interfaces:**

- Consumes: `InputState` (plan 03), `CombatantState`, `ChargePool`, `deriveStats`.
- Produces: `class Player extends Phaser.Physics.Arcade.Sprite { readonly combat: CombatantState; stats: PlayerStats; readonly buffs: ActiveBuffs; aimAngle: number; isDashing: boolean; facing: 1 | -1; constructor(scene, x, y, runner: Runner); tick(input: InputState, now: number, dt: number): void; setStats(next: PlayerStats): void }` and scene event `player:dashed`.

- [ ] **Step 1:** Implement movement with acceleration/deceleration from Global Constraints, `setDepth(y + 1000)`, flip by aim direction, idle/run animation keys from `textureFor('runner', id)`.
- [ ] **Step 2:** Dash on `input.dash` when `ChargePool.use(now)`: direction = move vector, or aim direction when not moving; set body velocity `48 / 0.12` px/s for 120 ms, `grantInvuln(now, 200)`, ignore move input while dashing. Afterimage: 3 fading copies (alpha tween), depth below player.
- [ ] **Step 3:** Add a sandbox room with walls (static group). **Verify manually:** run at 60 Hz and with devtools CPU throttle, and on a 144 Hz monitor if available: crossing a 480 px room takes the same time (≈5 s) on all; dash into wall stops flush; holding two keys diagonal is not faster than one.
- [ ] **Step 4:** Commit `feat(game): player movement and dash`.

### Task 4: Aim, crosshair hook and skill system with Overcharge

**Interfaces:**

- Produces:
  - `class AimAssist { constructor(scene); update(player: Player, cursor: Vec2, mode: 'soft' | 'full'): number }` (collects `AimTarget[]` from a `targets()` provider registered by the guardian system in plan 07; LOS via `Phaser.Geom.Intersects.LineToRectangle` against wall tiles' bounds)
  - `interface Skill { id: string; cooldownMs: number; activate(ctx: SkillContext, now: number): void; update?(ctx, now, dt): void }`, `SkillContext = { scene: Phaser.Scene; player: Player }`
  - `class SkillSystem { constructor(skill: Skill); tryActivate(ctx, now): boolean; cooldown: Cooldown }`
  - `class Overcharge implements Skill` (id `overcharge`, `addBuff(player.buffs, 'overcharge', now, 5000)`, emits `skill:activated`)
  - `createSkill(runner: Runner): Skill` factory (`overcharge`; `patch-drone` throws "not implemented" until plan 23)

- [ ] **Step 1:** Player stores `aimAngle` from `AimAssist.update` each frame; `aimAngle` is what weapons read (plan 06). The raw cursor angle is kept separately for the crosshair (plan 08).
- [ ] **Step 2:** Skill on `input.skill`; ignored while `scene.scene.isPaused()`. During Overcharge, tint the Runner with a pulsing `amber-300` ADD tint (`setTintMode(Phaser.TintModes.ADD)`).
- [ ] **Step 3: Verify manually** in sandbox: RMB and Space both trigger; second press within 20 s does nothing; HUD placeholder text shows remaining cooldown.
- [ ] **Step 4:** Commit `feat(game): aim assist, skill system, vex overcharge`.

## Acceptance

- [ ] Movement and dash speed are frame-rate independent.
- [ ] Soft assist is noticeable but never snaps more than 8°; full auto-aim works with mouse resting still.
- [ ] Overcharge lasts 5 s, cooldown 20 s.
