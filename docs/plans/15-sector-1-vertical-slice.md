# 15 · Sector 1 Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A complete Storage Wing run from Start to Gatekeeper to Lift, 8–10 minutes long: Turret Node, five Sector 1 combat rooms, the rust-and-amber theme, sector configuration data, the Lift scene and the sector-transition pipeline that Sectors 2–3 reuse.

**Architecture:** Sectors are data (`sectors.json`: name, tileset, accent, music, Bleed level). `DungeonScene.buildSector(n)` tears down world objects and rebuilds from a new layout while `RunState`, `Player` combat state, loadout and mods persist. `LiftScene` is a short interlude launched over a dimmed dungeon.

**Tech Stack:** Phaser 4, Tiled, TypeScript.

**Milestone:** M3 (gate) · **Depends on:** 11, 12, 13, 14 · **Spec:** `DESIGN.md` §7.3, §15 D3, D8; PRD "Sectors", "Room types" (Lift), "Target pacing", M3 row

## Global Constraints

- Sector 1 "Storage Wing": rust and amber, crates, cargo rails; guardians Drone, Crawler, Turret; boss Gatekeeper.
- Lift: heal 2 HP, choose 1 of 3 Vault Mods (not cancellable), go down.
- Content target for this plan: 5 Sector 1 combat templates (2 exist from plan 10).
- Target pacing Sector 1 ≈ 8 minutes.

## Review Focus

- Transition must destroy every world object of the old sector (guardians, bullets, pickups, doors, tilemap, colliders); count game objects before/after in DEV.
- Weapons on the floor in Sector 1 are lost on descent (expected), but held weapons, HP, shield, energy and mods carry over.
- The player cannot take damage or move during the Lift interlude.
- Pressing Esc in the Lift opens nothing (pause disabled there), so the run timer cannot be gamed.
- Turret Node must not fire through walls at a player behind cover (LOS check before each volley).

## File Structure

```
packages/shared/src/data/sectors.json, packages/shared/src/schemas/content.ts (SectorSchema)
apps/web/
  public/assets/tilemaps/rooms/combat-s1-03..05.json, tiles-s1.png
  src/game/
    systems/ai/TurretAi.ts
    entities/LiftPad.ts
    scenes/LiftScene.ts
    scenes/DungeonScene.ts            # buildSector / teardownSector
    logic/run/pacing.ts, pacing.test.ts
```

---

### Task 1: Sector config data

**Interfaces:**

- Produces: `SectorSchema { id: 1 | 2 | 3; name: string; tileset: string; accent: PaletteToken; music: string; bleedLevel: 0 | 1 | 2; radioEnterBeat: string }`, `SECTORS: Record<SectorId, Sector>` exported from `@dh/shared`. Values: 1 Storage Wing / `tiles-s1` / `amber-500` / `music.sector1` / 0 / `s1-enter`; 2 Conduit Works / `tiles-s2` / `teal-400` / `music.sector2` / 1 / `s2-enter`; 3 Core Approach / `tiles-s3` / `bleed-500` / `music.sector3` / 2 / `s3-enter`.

- [ ] **Step 1:** Test in `content.test.ts`: three sectors, names match PRD exactly.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(shared): sector config`.

### Task 2: Turret Node

**Interfaces:**

- Produces: `class TurretAi` (`ai: 'turret'`), attack params in `guardians.json`: `{ volleyEveryMs: 1600, spreadCount: 3, spreadArcDeg: 30, boltSpeed: 100, windupMs: 400 }`; stationary (immovable body, ignores knockback).

- [ ] **Step 1:** FSM `idle` (no LOS) → `windup` (barrel glows 400 ms) → `fire` (3-way `spread` toward player) → `idle`. LOS via the same wall check AimAssist uses.
- [ ] **Step 2: Verify in sandbox** (`spawn=turret-node`): hiding behind a pillar stops volleys; it teaches "use cover".
- [ ] **Step 3:** Commit `feat(game): turret node`.

### Task 3: Sector 1 rooms and theme

- [ ] **Step 1:** Author `combat-s1-03..05` in Tiled (crates as cover, cargo rails decor, varied spawn layouts: open hall, pillared, split by rails). Each must pass `validateTemplate`; run `vp run @dh/web#rooms`.
- [ ] **Step 2:** Swap placeholder tiles for a rust/amber `tiles-s1` set (licence-checked; CREDITS.md). One or two corrupted props with a `bleed-500` glow as the Sector 1 hint (DESIGN.md §11.2).
- [ ] **Step 3:** Commit `content: sector 1 rooms and theme`.

### Task 4: Lift pad, Lift scene and sector transition

**Interfaces:**

- Consumes: `boss:dead`, `rollModChoices`, `ModPick`, `heal`, `advanceSector`.
- Produces:
  - `class LiftPad` spawned at the arena's `lift` spawn point on `boss:dead` (except `core-warden`); E to use.
  - `LiftScene` (data: `{ choices: ModId[] }`): pauses `dungeon`, fades to `ink`, heals 2 HP, shows `ModPick` (not cancellable), then a 1.2 s descent animation; on finish calls `dungeon.descend()`.
  - `DungeonScene.teardownSector(): void`, `DungeonScene.buildSector(n: SectorId): void`, `DungeonScene.descend(): void` (`advanceSector(run)` → teardown → build; emits `sector:entered { sector }` and `hud:rebind`).
  - Until plan 19 ships Sectors 2–3, `descend()` from Sector 1 in this plan ends the run as `abandon` with a DEV toast "Slice complete".

- [ ] **Step 1:** Implement. Mod choice RNG stream: `fork('mods:lift:s{sector}')`.
- [ ] **Step 2: Verify manually:** kill Gatekeeper → lift pad → heal + pick → descent; DEV game-object count after teardown returns to the post-boot baseline (±HUD).
- [ ] **Step 3:** Commit `feat(game): lift scene and sector transition`.

### Task 5: Pacing check and slice playtest (M3 gate)

**Interfaces:**

- Produces: `estimateSectorMinutes(layout: DungeonLayout, sector: SectorId): number` (combat rooms × 1.2 min + boss 1.5 + 0.5 travel), used as a sanity check, not a rule.

- [ ] **Step 1: Test:** across 200 seeds for Sector 1 the estimate stays within 7–11 minutes; if not, adjust `SECTOR_BASE` or combat counts.
- [ ] **Step 2:** → FAIL/PASS cycle; commit.
- [ ] **Step 3:** Playtest with 3 people: time a Sector 1 run start to boss kill. Record in `docs/playtests/m3-slice.md` (time, deaths, which room killed them, Gatekeeper attempts).
- [ ] **Step 4:** Tune JSON (budgets, HP, fire rates) until the median is 8–10 minutes. Commit `balance: sector 1 pacing`.

## Acceptance (M3 gate)

- [ ] A full Sector 1 run, start to boss, takes 8–10 minutes for a median tester.
- [ ] Chests, Vault Mods, HUD and Lift all work in that run.
