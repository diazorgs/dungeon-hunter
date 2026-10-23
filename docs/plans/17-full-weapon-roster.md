# 17 · Full Weapon Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The remaining nine weapons, each as its JSON entry plus at most one new behaviour class: Shock Baton, Line Rifle, Arc Carbine, Scatter Coil, Pulse Lance, Grid Cutter, Fuse Launcher, Static Repeater, Null Cannon.

**Architecture:** New behaviours register in `systems/weapons/behaviours/registry.ts` (plan 06). Any math they need (pierce bookkeeping, chain target selection, beam ramp, charge level, explosion falloff, melee arc test) is pure in `logic/weapons/`. Bounce already exists in `Bullet`.

**Tech Stack:** Phaser 4, TypeScript.

**Milestone:** M4 · **Depends on:** 06, 08 · **Spec:** `DESIGN.md` §6.1; PRD "Weapons" table, "Rule for adding content later"; plan 02 Task 3 starting values

## Global Constraints

- Behaviours: `melee-swing`, `pierce`, `burst`, `bounce`, `beam`, `explosive`, `chain`, `charge-orb`. Scatter Coil reuses `bounce` (bullet + `bounces: 1`); Grid Cutter reuses `melee-swing` with `deletesBullets`.
- Each weapon gets a `shake`, `sfx` and `sprite` entry (plan 08 conventions).
- Fuse Launcher is self-safe. Pulse Lance costs 5 energy per second, not per shot. Null Cannon: hold to charge, release to fire.

## Review Focus

- Pulse Lance with 0 energy must stop the beam immediately and dry-fire, and the damage ramp must reset when the beam stops or the target changes.
- Null Cannon released before full charge: rule is fire at proportional power ≥ 30% charge, otherwise cancel with no energy spent.
- Static Repeater chains must not hit the same enemy twice in one chain or jump through walls.
- Grid Cutter deleting enemy bullets must return them to the pool (and count for nothing else).
- Melee swings during a dash still hit; swings with nothing in range still cost nothing and play a whiff sound.

## File Structure

```
apps/web/src/game/
  logic/weapons/melee.ts, chain.ts, beam.ts, charge.ts, explosion.ts (+ .test.ts each)
  systems/weapons/behaviours/MeleeSwing.ts, Pierce.ts, Burst.ts, Beam.ts, Explosive.ts, Chain.ts, ChargeOrb.ts
```

---

### Task 1: Pure weapon math

**Interfaces:**

- Produces:
  - `inMeleeArc(origin: Vec2, aim: number, arcDeg: number, range: number, p: Vec2): boolean`
  - `chainTargets(start: { id: number; x: number; y: number }, candidates: readonly AimTarget[], jumps: number, range: number): number[]` (nearest-next, no repeats, visible only)
  - `beamDps(heldMs: number, p: { baseDps: number; maxDps: number; rampSec: number }): number` (linear ramp)
  - `chargeLevel(heldMs: number, chargeSec: number): number` (0..1), `chargedShot(level: number): { fire: boolean; powerMul: number }` (fire when level ≥ 0.3, `powerMul = level`)
  - `explosionDamage(base: number, dist: number, radius: number): number` (full within 40% radius, linear falloff to 50% at the edge, 0 outside)

- [ ] **Step 1: Tests:** a point at the edge of the arc and range is inside; behind is outside; chain with 2 jumps over 4 candidates picks nearest unvisited each hop and stops when none in range; `beamDps(0)` = 8, `beamDps(1500)` = 20, `beamDps(9999)` = 20; `chargedShot(0.29).fire === false`; `explosionDamage(10, 0, 32) === 10`, `(10, 32, 32) === 5`, `(10, 33, 32) === 0`.
- [ ] **Step 2:** `vp test src/game/logic/weapons` → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): weapon behaviour math`.

### Task 2: Melee, pierce, burst, bounce weapons

**Interfaces:**

- Produces: `MeleeSwing` (arc sprite 120 ms; damages guardians in arc once per swing; `stunSec` applies `stun`; `deletesBullets` kills enemy bullets in arc), `Pierce` (bullet with `pierce: count`, `hitIds` prevents double hits), `Burst` (queues `count` shots at `intervalMs` using scene time; one energy cost per burst shot).
- JSON: shock-baton, grid-cutter, line-rifle, arc-carbine, scatter-coil (bounce via `BulletBehaviour` reading `behaviourParams.bounces`).

- [ ] **Step 1:** Implement; register.
- [ ] **Step 2: Verify in sandbox** (`spawn=shock-baton,grid-cutter,line-rifle,arc-carbine,scatter-coil`): baton stuns 0.5 s; cutter erases a bullet ring; rifle passes through exactly one enemy; carbine fires 3-round bursts; coil pellets bounce once off walls.
- [ ] **Step 3:** Commit `feat(game): melee, pierce, burst, bounce weapons`.

### Task 3: Beam, explosive, chain, charge weapons

**Interfaces:**

- Produces: `Beam` (raycast to first wall/enemy each frame up to `range`, `beamDps` ramp, drains `energyPerSecond × dt`, loop SFX while held), `Explosive` (shell bullet; on hit/wall/lifetime spawns blast: `explosionDamage` to guardians in radius, no player damage, big shake), `Chain` (on hit, `chainTargets` then instant lightning lines, damage × `dmgMul`), `ChargeOrb` (hold builds `chargeLevel` with a growing orb at the barrel; release → `chargedShot`; orb pierces all, scales damage and radius by `powerMul`; energy spent on release).

- [ ] **Step 1:** Implement; register.
- [ ] **Step 2: Verify in sandbox:** lance ramps and stops at 0 energy; launcher never hurts the player point-blank; repeater jumps to 2 nearby enemies, not through walls; cannon cancels below 30% and fires a huge orb at 100%.
- [ ] **Step 3:** Commit `feat(game): beam, explosive, chain, charge weapons`.

### Task 4: Roster check

- [ ] **Step 1:** Export `IMPLEMENTED_BEHAVIOURS: readonly Weapon['behaviour'][]` from `game/logic/weapons/behaviours.ts` (the registry asserts at boot that it registered exactly this list). Test `every weapon behaviour is implemented`: each `WEAPONS[id].behaviour` is in the list.
- [ ] **Step 2:** Sandbox key `W` cycles through all 12 weapons; record a 30 s feel note per weapon in `docs/playtests/m4-weapons.md`.
- [ ] **Step 3:** Commit `test: weapon roster coverage`.

## Acceptance

- [ ] All 12 PRD weapons usable; each behaves as its PRD "Behaviour" column says.
- [ ] No weapon needed more than one new behaviour class.
