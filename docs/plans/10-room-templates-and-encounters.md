# 10 · Room Templates and Encounters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a `DungeonLayout` into a playable sector: Tiled room templates composed into one tilemap with corridors, doors that lock on entry and unlock on clear, wave spawning under a difficulty budget, and room-aware camera framing.

**Architecture:** Tiled JSON is data. A pure `composeSector` stitches template tile arrays into one sector grid and returns room rects, door slots and spawn points; Phaser only renders the result. Encounters are a pure plan (`buildWaves`) executed by `EncounterSystem`.

**Tech Stack:** Tiled (JSON export, embedded tilesets), Phaser 4 Tilemaps, TypeScript.

**Milestone:** M2 · **Depends on:** 07, 09 · **Spec:** `DESIGN.md` §7.3; PRD "Dungeon structure", "Room types per sector", "Generation rules"; SETUP.md §10 Tiled gotchas

## Global Constraints

- Rooms 15×11 tiles of 16 px; grid pitch 19×15 tiles; corridors 3 tiles wide, 4 long; doors centred (N/S column 7, E/W row 5), 3 tiles wide.
- Tiled: export JSON, **embed tilesets**, wall tiles carry `collides: true`; `layer.setCollisionByProperty({ collides: true })`.
- Budget per combat room = `SECTOR_BASE[s] + roomsClearedThisRun`, `SECTOR_BASE = { 1: 4, 2: 8, 3: 12 }`; 2 waves, 3 when budget ≥ 10.
- Doors lock only in Combat (and Boss, plan 14) rooms; Start, Chest, Vendor, Log rooms never lock.

## Review Focus

- Player standing in a doorway when doors lock must be pushed fully into the room (never locked outside or inside the door body).
- A guardian knocked into a corridor before doors close must be teleported back into the room or the room never clears.
- Wave N+1 must not spawn on top of the player: spawn points within 40 px of the player are skipped.
- Re-entering a cleared room never re-locks or re-spawns.
- Budget leftover smaller than the cheapest guardian ends the wave (no infinite loop).

## File Structure

```
apps/web/
  public/assets/tilemaps/rooms/{start,combat-s1-01..05,chest,vendor,log,boss-s1}.json  # s2/s3 in plan 19
  public/assets/tilemaps/tiles-*.png
  scripts/build-room-catalog.ts          # Tiled dir → src/game/content/roomCatalog.json
  src/game/
    logic/dungeon/tiled.ts, tiled.test.ts          # parse + validate a template
    logic/dungeon/compose.ts, compose.test.ts      # composeSector
    logic/encounter/budget.ts, budget.test.ts
    logic/camera.ts, camera.test.ts
    content/roomCatalog.json                        # generated, committed
    entities/Door.ts
    systems/SectorBuilder.ts
    systems/EncounterSystem.ts
    systems/CameraDirector.ts
```

---

### Task 1: Template conventions, parser and validator

**Interfaces:**

- Produces:
  - Tiled conventions (document in `public/assets/tilemaps/README.md`): map properties `roomType`, `sectors` ("1,2"), `doors` ("N,E,S,W"); tile layers `floor`, `walls`, `decor`; object layer `spawns` with point objects whose `type` is one of `guardian | crate | chest | vendor | log | player-start | lift | boss`.
  - `interface RoomTemplate extends TemplateMeta { width: 15; height: 11; floor: number[]; walls: number[]; decor: number[]; spawns: { kind: SpawnKind; x: number; y: number }[] }`
  - `parseTiledRoom(json: unknown, id: string): RoomTemplate` and `validateTemplate(t: RoomTemplate): string[]` (size, door openings free of walls for each declared door, wall ring closed elsewhere, combat ≥ 6 `guardian` spawns, start has `player-start`, chest has `chest`, boss has `boss`)

- [ ] **Step 1:** Tests using small inline Tiled JSON fixtures: a valid combat room passes; a room declaring door `N` with a wall at (7,0) fails with a message naming `N`; a combat room with 5 guardian spawns fails; a non-embedded tileset (`source` field) throws "embed tilesets".
- [ ] **Step 2:** `vp test src/game/logic/dungeon/tiled.test.ts` → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** `scripts/build-room-catalog.ts` reads every `rooms/*.json`, runs parse + validate, fails loudly on errors, writes `roomCatalog.json` (metadata only). Add `"rooms": "node --experimental-strip-types scripts/build-room-catalog.ts"` to web scripts and a test asserting every committed template validates (reads the directory with `node:fs`).
- [ ] **Step 6:** Author Sector 1 starter set in Tiled: start, chest, log, boss-s1 (arena placeholder 15×11), and 2 combat rooms (the other 3 in plan 15).
- [ ] **Step 7:** Commit `feat: tiled room templates, parser, catalog`.

### Task 2: Compose a sector

**Interfaces:**

- Consumes: `DungeonLayout` with `templateId`s (plan 09), `RoomTemplate`.
- Produces:
  - `interface ComposedSector { widthTiles: number; heightTiles: number; floor: Int32Array; walls: Int32Array; decor: Int32Array; rooms: { id: number; rect: TileRect; worldRect: Rect; type: RoomType }[]; doors: { roomId: number; dir: Dir; tileRect: TileRect }[]; spawns: { roomId: number; kind: SpawnKind; x: number; y: number }[] }`
  - `composeSector(layout: DungeonLayout, templates: ReadonlyMap<string, RoomTemplate>, tiles: { corridorFloor: number; corridorWall: number }): ComposedSector`
  - Unused door openings are sealed with wall tiles; corridors are carved between connected rooms only.

- [ ] **Step 1: Tests:** two rooms connected E–W produce a 3-wide, 4-long corridor of floor tiles with walls on both sides; a room's unused `N` door is wall; spawn world coordinates are offset by the room's grid position (`gx × 19 × 16`); total size is `5 × 19` by `5 × 15` tiles.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): compose sector tilemap`.

### Task 3: SectorBuilder, doors and camera framing

**Interfaces:**

- Produces:
  - `class SectorBuilder { build(scene, composed: ComposedSector, tilesetKey: string): { map: Phaser.Tilemaps.Tilemap; wallLayer: Phaser.Tilemaps.TilemapLayer; doors: Door[] } }` (blank tilemap + `putTilesAt`; `setCollisionByProperty({ collides: true })`)
  - `class Door extends Phaser.Physics.Arcade.Image { roomId: number; dir: Dir; lock(): void; unlock(): void }` (static body, closed/open frames, lock/unlock SFX)
  - `logic/camera.ts`: `roomAt(p: Vec2, rooms, insetPx = 8): number | null`, `cameraTarget(p: Vec2, rooms): Vec2` (room centre when inside a room, player position in corridors)
  - `class CameraDirector { update(player, rooms, dt): void }` (lerp 0.12 toward `cameraTarget`, bounds = sector world size)

- [ ] **Step 1: Tests for camera.ts:** point inside a room returns its id; point in the corridor returns null; within 8 px of a room edge counts as outside (prevents flicker at doorways).
- [ ] **Step 2:** → FAIL. **Step 3:** Implement logic, then SectorBuilder/Door/CameraDirector. `DungeonScene.create` now: `generateSector → assignTemplates → composeSector → build`, player at Start's `player-start`. **Step 4:** → PASS.
- [ ] **Step 5: Verify manually:** `?seed=ABCD1234` gives the same sector every reload; walking through doors frames each room; corridors follow the player.
- [ ] **Step 6:** Commit `feat(game): build sector from layout, doors, camera framing`.

### Task 4: Difficulty budget, waves and EncounterSystem

**Interfaces:**

- Produces:
  - `SECTOR_BASE = { 1: 4, 2: 8, 3: 12 }`, `roomBudget(sector: SectorId, roomsClearedThisRun: number): number`
  - `interface WaveEntry { guardianId: GuardianId; elite: boolean; bleed: boolean }`, `type Wave = WaveEntry[]`
  - `buildWaves(budget: number, pool: readonly { id: GuardianId; cost: number }[], rng: Rng, opts?: { eliteChance?: number; bleed?: boolean }): Wave[]` — wave count 2 (3 when budget ≥ 10); budget split evenly across waves; each wave buys random affordable guardians until nothing fits; at most one elite across all waves (elite costs 2× cost).
  - `encounterPool(sector: SectorId, implementedAi: ReadonlySet<string>): { id: GuardianId; cost: number }[]` (guardians with `sectorMin ≤ sector` whose AI is registered)
  - `class EncounterSystem { constructor(scene, guardians: GuardianSystem, doors, sector, rng); update(player, now): void; readonly roomsCleared: number }`; scene events `room:entered { roomId, type }`, `room:locked { roomId }`, `wave:started { roomId, index, total }`, `room:cleared { roomId, type }`

- [ ] **Step 1: Tests:**

```ts
test("budget grows with rooms cleared", () =>
  expect([roomBudget(1, 0), roomBudget(1, 3), roomBudget(3, 10)]).toEqual([4, 7, 22]));
test("two waves below 10, three at 10+", () => {
  expect(buildWaves(9, pool, rng).length).toBe(2);
  expect(buildWaves(10, pool, rng).length).toBe(3);
});
test("wave spend never exceeds its share", () => {
  /* sum of costs per wave ≤ ceil(budget / waves) */
});
test("leftover below cheapest cost terminates", () =>
  expect(buildWaves(1, [{ id: "shield-bot", cost: 3 }], rng)).toEqual([[], []]));
test("at most one elite", () => {
  /* eliteChance 1 → exactly one elite overall */
});
test("pool respects sectorMin and implemented AI", () =>
  expect(
    encounterPool(1, new Set(["hover-shooter", "rusher"]))
      .map((p) => p.id)
      .sort(),
  ).toEqual(["crawler", "sentry-drone"]));
```

- [ ] **Step 2:** → FAIL. **Step 3:** Implement logic. Then `EncounterSystem`: on entering an uncleared combat room (`roomAt` with inset), push the player 12 px inward if overlapping a door, lock doors, emit `room:locked`, then for each wave show 600 ms spawn markers (`bleed-500` ring) at random room spawn points ≥ 40 px from the player, spawn, wait until `aliveCount() === 0`; leash: guardians outside the room rect are moved back to the nearest spawn point. On clear: unlock, emit `room:cleared`, increment `roomsCleared`. Spawn RNG stream: `fork('spawns:s{sector}:r{roomId}')`. **Step 4:** → PASS.
- [ ] **Step 5: Verify manually:** enter a combat room → doors slam, 2 waves, doors open; re-enter → nothing happens; dash into the doorway at lock time → ends up inside.
- [ ] **Step 6:** Commit `feat(game): difficulty budget and wave encounters`.

## Acceptance (M2 gate, rooms half)

- [ ] Any seed produces a walkable sector; every combat room locks, runs its waves and unlocks.
- [ ] Generated rooms use templates from the catalog; invalid templates fail `vp run @dh/web#rooms` and CI.
