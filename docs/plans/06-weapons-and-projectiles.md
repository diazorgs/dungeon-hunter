# 06 · Weapons and Projectiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A data-driven weapon system: pooled bullets for player and enemies, a behaviour registry keyed by `weapon.behaviour`, energy spending, carry-two with swap, and the first three weapons (Rust Pistol, Rivet SMG, Breach Shotgun).

**Architecture:** Fire timing and spread are pure (`logic/weapons/fire.ts`). `systems/weapons/WeaponSystem.ts` owns the equipped loadout and asks the behaviour for the weapon's `behaviour` to spawn projectiles from `BulletPool`. Enemy bullets use the same pool class with a different group, so plan 14's bullet patterns reuse it.

**Tech Stack:** Phaser 4 Arcade Physics groups, TypeScript.

**Milestone:** M1 · **Depends on:** 03, 04, 05 · **Spec:** `DESIGN.md` §4.5, §6.1, §7.1; PRD "Weapons and Vault Mods", "Combat feel checklist", risk "Performance with many bullets"

## Global Constraints

- Never `new Bullet()` per shot: `group.get()` from pools of 512 (player) and 768 (enemy).
- Weapon numbers come only from `WEAPONS` (`@dh/shared`). A weapon must be addable as JSON + at most one behaviour class.
- Player bullets: `amber-300`, 2–3 px, no outline. Enemy bullets: `bleed-300` core, 1 px `bone` outline, 4–6 px.
- Carry 2 weapons; picking up a third drops the current one on the floor.

## Review Focus

- Holding fire across a swap must not fire the new weapon faster than its own rate (cooldown is per weapon instance, and swapping applies a 150 ms swap delay).
- Pool exhaustion (512 live bullets) must silently skip the shot, not throw or allocate.
- Bullets leaving the room bounds or hitting walls must return to the pool on the same frame (no zombie bodies).
- Very low frame rates (20 fps) must not drop shots: fire timing accumulates owed shots up to 3 per frame.
- Energy reaching exactly the shot cost fires and lands on 0; one less dry-fires.

## File Structure

```
apps/web/src/game/
  logic/weapons/fire.ts, fire.test.ts       # timing, spread, pellet angles
  logic/weapons/loadout.ts, loadout.test.ts # carry-2, swap, pickup/drop
  entities/Bullet.ts
  systems/BulletPool.ts
  systems/weapons/WeaponSystem.ts
  systems/weapons/behaviours/Behaviour.ts, registry.ts, BulletBehaviour.ts
  entities/WeaponPickup.ts
```

---

### Task 1: Fire timing and spread

**Interfaces:**

- Produces:
  - `interface FireClock { nextShotAt: number }`
  - `shotsDue(clock: FireClock, now: number, intervalMs: number, holding: boolean, maxPerFrame = 3): number` (advances `nextShotAt`; when not holding, sets `nextShotAt = max(nextShotAt, now)` so tapping is never faster than the rate)
  - `fireIntervalMs(weapon: Weapon, fireRateMul: number): number` (`1000 / (weapon.fireRate × mul)`)
  - `pelletAngles(aim: number, pellets: number, spreadDeg: number, rand: () => number): number[]` (pellets > 1: evenly fanned across `spreadDeg` plus ±10% jitter; pellets = 1: uniform random within ±spread/2)

- [ ] **Step 1: Tests:** at 4 shots/s holding from t=0, `shotsDue` returns 1 at 0, 0 at 249, 1 at 250; a 1000 ms frame at 12/s returns 3 (capped); releasing and pressing at t=100 after a shot at 0 (interval 250) returns 0; `pelletAngles(0, 5, 30, () => 0.5)` returns 5 angles spanning −15°..15° symmetric; `fireIntervalMs(WEAPONS['rivet-smg'], 2)` ≈ 41.67.
- [ ] **Step 2:** `vp test src/game/logic/weapons` → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(logic): weapon fire timing and spread`.

### Task 2: Loadout (carry two, swap, pickup)

**Interfaces:**

- Produces:
  - `interface Loadout { slots: [WeaponId, WeaponId | null]; active: 0 | 1 }`
  - `createLoadout(starter: WeaponId = 'rust-pistol'): Loadout`
  - `swap(l: Loadout): boolean` (false when slot 2 empty)
  - `pickUp(l: Loadout, id: WeaponId): { dropped: WeaponId | null }` (fills empty slot 2 first and makes it active; otherwise replaces active and returns it as dropped)
  - `activeWeapon(l): WeaponId`

- [ ] **Step 1: Tests:** new loadout holds only the pistol; swap with empty slot returns false; first pickup fills slot 2 and activates it; second pickup replaces the active weapon and returns it as `dropped`; picking up a weapon already held still swaps (dropping the active one).
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): two-slot loadout`.

### Task 3: Bullet pool

**Interfaces:**

- Produces:
  - `class Bullet extends Phaser.Physics.Arcade.Image { owner: 'player' | 'enemy'; damage: number; knockback: number; pierceLeft: number; bouncesLeft: number; behaviourId: string; hitIds: Set<number>; fire(x, y, angle, speed, opts: BulletOpts): void; kill(): void }`
  - `BulletOpts = { damage: number; knockback?: number; pierce?: number; bounces?: number; lifetimeMs?: number; texture: 'pbullet' | 'ebullet' | string; scale?: number }`
  - `class BulletPool { constructor(scene, owner, maxSize); spawn(x, y, angle, speed, opts): Bullet | null; forEachActive(fn): void; activeCount(): number; clear(): void; readonly group: Phaser.Physics.Arcade.Group }`

- [ ] **Step 1:** Pool via `scene.physics.add.group({ classType: Bullet, maxSize, runChildUpdate: false })`; `spawn` uses `group.get()` and returns null when exhausted. Kill on lifetime, world bounds, or wall collide (`physics.add.collider(group, wallLayer, onWall)`), unless `bouncesLeft > 0` (reflect velocity, decrement).
- [ ] **Step 2:** Generate the two bullet textures once in `PreloadScene` from a `Graphics` object (`generateTexture`) using palette colours.
- [ ] **Step 3: Verify in sandbox:** key `1` (plan 03) now spawns 300 enemy bullets via the pool; FPS readout stays ≥ 58 on the reference laptop; `activeCount()` returns to 0 after they leave the room.
- [ ] **Step 4:** Commit `feat(game): pooled bullets`.

### Task 4: Behaviour registry, WeaponSystem and the first three weapons

**Interfaces:**

- Consumes: `Player.aimAngle`, `effectiveFireRateMul`, `effectiveEnergyCost`, `spendEnergy`, `Loadout`.
- Produces:
  - `interface Behaviour { id: Weapon['behaviour']; fire(ctx: FireContext): void; update?(ctx: FireContext, dt: number): void; onRelease?(ctx: FireContext): void }`
  - `FireContext = { scene; weapon: Weapon; origin: Vec2; angle: number; pool: BulletPool; stats: PlayerStats; now: number; holding: boolean }`
  - `registerBehaviour(b: Behaviour)`, `getBehaviour(id): Behaviour` (throws naming the missing behaviour)
  - `class WeaponSystem { loadout: Loadout; constructor(scene, player, pool); update(input: InputState, now, dt): void; equip(id): void; onPickup(id): WeaponId | null }`
  - Scene events: `weapon:fired { weaponId, x, y, angle }`, `weapon:dryfire { weaponId }`, `weapon:swapped { active: WeaponId }`

- [ ] **Step 1:** `BulletBehaviour` (behaviour `bullet`) spawns `pellets` bullets at `pelletAngles`, damage = `round(weapon.damage × stats.damageMul)`, knockback from weapon data, `bounces: stats.flags.has('bulletsBounce') ? 1 : 0`.
- [ ] **Step 2:** `WeaponSystem.update`: on `swap`, swap and set a 150 ms swap delay; compute `shotsDue` per active weapon clock; for each due shot, `spendEnergy(effectiveEnergyCost(...))` or emit `weapon:dryfire` and stop; muzzle origin = player + 10 px along aim.
- [ ] **Step 3:** `WeaponPickup` entity: floor sprite with rarity-coloured outline (DESIGN.md §11.2); `E` within 16 px calls `onPickup`, spawning the dropped weapon at the same spot.
- [ ] **Step 4: Verify in sandbox** (`?scene=sandbox&spawn=rivet-smg,breach-shotgun`): pistol never runs out; SMG drains 1 energy/shot; shotgun shows 5 pellets; pick up both, the third pickup drops the active one; Overcharge doubles SMG rate and freezes the energy counter.
- [ ] **Step 5:** Commit `feat(game): weapon system with pistol, smg, shotgun`.

## Acceptance

- [ ] Adding a fourth weapon that uses `bullet` needs only a JSON entry (prove by temporarily adding a test weapon, then removing it).
- [ ] 300 bullets on screen at ≥ 58 fps in the sandbox.
