# 19 · Sectors 2 and 3, Vendor Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full three-sector run offline: Conduit Works and Core Approach themes, their 10 combat templates and boss arenas, the Bleed escalation across sectors, the Vendor terminal (Scrap for weapons, health, energy), and the run flow from Sector 1 through to the Core Chamber.

**Architecture:** Everything reuses the slice pipeline (plan 15): `SECTORS` data drives tileset, accent, music and Bleed level; `buildSector(n)` already rebuilds the world. The Vendor is a room-type entity with a pure stock/price model (`logic/vendor.ts`).

**Tech Stack:** Tiled, Phaser 4, TypeScript.

**Milestone:** M4 · **Depends on:** 15, 16, 18 · **Spec:** PRD "Sectors" table, "Room types" (Vendor), "Content target", "Art direction" (Bleed growth); `DESIGN.md` §7.3, §7.4, §11.2

## Global Constraints

- Sector 2 Conduit Works: teal pipes, steam, cable bundles; guardians = Sector 1 + Shield Bot, Arc Spider, Mortar; boss Conduit Hydra.
- Sector 3 Core Approach: magenta Bleed glow, warped metal; Bleed variants + Bleed Wraith; boss Core Warden in the Core Chamber (plan 20).
- Vendor: one per sector in Sectors 2 and 3; never adjacent to Start (generator rule, plan 09). Spend Scrap on weapons, health, energy.
- Content target: 5 combat templates per sector theme; 1 template each for special rooms per theme; 3 boss arenas total.
- Cut order #2: Vendor must be removable with `includeVendor: false` and nothing else.

## Review Focus

- Buying with exactly enough Scrap succeeds and lands on 0; one short is refused with a clear message and no state change.
- Buying a weapon with both slots full drops the active weapon on the floor (same rule as pickups), never deletes it.
- Health purchase at full HP must be refused (no wasted Scrap); energy purchase at full energy likewise.
- Vendor stock is fixed per visit (seeded), not re-rolled by walking out and back in.
- Sector 3's Bleed treatment (camera filter tint) must not tint the HUD scene.

## File Structure

```
packages/shared/src/data/vendor.json                  # prices
apps/web/
  public/assets/tilemaps/rooms/{combat-s2-01..05, combat-s3-01..05, start-s2, start-s3, chest-s2, chest-s3, vendor-s2, vendor-s3, log-s2, log-s3, boss-s2(plan 18), core-chamber}.json
  public/assets/tilemaps/tiles-s2.png, tiles-s3.png
  src/game/
    logic/vendor.ts, vendor.test.ts
    entities/VendorTerminal.ts
    hud/VendorPanel.ts
    systems/visuals/sectorAtmosphere.ts
```

---

### Task 1: Sector 2 and 3 content

- [ ] **Step 1:** Make `assignTemplates` pick per-sector special-room templates (`start-s2`, …) through their `sectors` property (no code change if plan 09 matched by sector; add a test that Sector 2 never receives a Sector 1-only template).
- [ ] **Step 2:** Author the Sector 2 set (5 combat, start, chest, vendor, log) in Tiled with `tiles-s2`; Sector 3 set with `tiles-s3`; `core-chamber` arena placeholder (plan 20 finalises). All pass `vp run @dh/web#rooms`.
- [ ] **Step 3:** Licence-check and credit any new tiles in `CREDITS.md`.
- [ ] **Step 4:** Commit `content: sector 2 and 3 rooms`.

### Task 2: Run flow across three sectors

**Interfaces:**

- Consumes: `DungeonScene.descend()` (plan 15).
- Produces: `descend()` now advances 1 → 2 → 3; after Sector 3's boss room the Warden fight (plan 20) ends the run; remove the plan 15 "slice complete" stub. `encounterPool` + `buildWaves(…, { bleed: sector === 3, eliteChance: ELITE_CHANCE[sector] })`.

- [ ] **Step 1: Test** (`logic/run/runState.test.ts`): `advanceSector` from 3 throws; a run object that passed through 3 sectors reports `sectorReached: 3`.
- [ ] **Step 2:** → FAIL → implement → PASS.
- [ ] **Step 3: Verify manually** with `?god=1`: walk a full seed through all three sectors (DEV key F6 kills all guardians in the room) and confirm music, tiles, accent and enemy pool change per sector.
- [ ] **Step 4:** Commit `feat(game): three-sector run flow`.

### Task 3: Sector atmosphere (Bleed growth)

**Interfaces:**

- Produces: `applySectorAtmosphere(scene: Phaser.Scene, sector: Sector): void` — Sector 1: none; Sector 2: faint steam particles + occasional magenta flicker on corrupted props; Sector 3: dungeon camera gets a magenta colour-grade filter and slow pulsing vignette (HUD camera untouched).

- [ ] **Step 1:** Implement with Phaser 4 camera filters (see filters skill). Keep cost < 1 ms/frame.
- [ ] **Step 2: Verify manually:** screenshots of each sector side by side read as "magenta grows from a hint to the whole screen".
- [ ] **Step 3:** Commit `feat(game): sector atmosphere`.

### Task 4: Vendor terminal (cut order #2)

**Interfaces:**

- Produces:
  - `vendor.json`: `{ weaponPrice: { common: 18, rare: 35, epic: 60 }, health: { price: 12, amount: 2 }, energy: { price: 8, amount: 60 } }`
  - `interface VendorStock { weapons: { id: WeaponId; price: number; sold: boolean }[]; health: { price: number; amount: number }; energy: { price: number; amount: number } }`
  - `rollVendorStock(rng: Rng, pool: readonly WeaponId[], sector: SectorId): VendorStock` (2 weapons, rarity-weighted like chests with +5 luck in Sector 3)
  - `tryBuy(stock, item: { kind: 'weapon'; index: number } | { kind: 'health' } | { kind: 'energy' }, ctx: { scrap: number; hpFull: boolean; energyFull: boolean }): { ok: true; cost: number } | { ok: false; reason: 'NOT_ENOUGH_SCRAP' | 'SOLD_OUT' | 'FULL' }`
  - `VendorTerminal` entity (E opens `VendorPanel`, stock rolled once with `fork('vendor:s{sector}')` when the room is built)

- [ ] **Step 1: Tests:** exact Scrap succeeds; one short → `NOT_ENOUGH_SCRAP`; buying the same weapon twice → `SOLD_OUT`; health at full → `FULL`; same seed → same stock.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement logic, entity and panel (keyboard/mouse/gamepad navigation like `ModPick`). **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(game): vendor terminal`.

## Acceptance

- [ ] With the Warden stubbed (plan 20 not yet merged), a run goes Sector 1 → 2 → 3 and reaches the Core Chamber.
- [ ] Vendor removable via `includeVendor: false` without other changes.
