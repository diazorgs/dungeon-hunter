# 12 · Run State, Loot and Pickups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One authoritative `RunState` for the whole run (sector, rooms cleared, bosses, kills, Scrap, mods, logs, timer), the loot it drives (energy orbs, Scrap, health capsules, crates, weapon chests, gold chests) and the `RunSummary` handed back to React.

**Architecture:** `logic/run/runState.ts` is a plain object with small reducer functions; `logic/loot/tables.ts` rolls drops from seeded streams. `DungeonScene` owns the instance across sectors (it survives sector rebuilds) and emits `run:ended` through the bridge with `toRunResult`.

**Tech Stack:** TypeScript, Phaser 4 Arcade (pickups), `@dh/shared` rules.

**Milestone:** M3 · **Depends on:** 06, 10 · **Spec:** `DESIGN.md` §4.3, §5, §7.4; PRD "Economy", "Room types" (Chest), "Weapons" (drop pool)

## Global Constraints

- `roomsCleared` counts combat rooms only. `durationSec` uses scene time accumulated while not paused (pause does not count; hit-stop does).
- Drop pool = `dropPool(config.unlockedWeaponIds)` (starter pool ∪ unlocks). Scrap resets each run.
- Loot RNG stream: `fork('loot:s{sector}')`; per-chest rolls are sequential in that stream, so the same seed and same order of chest opening yields the same loot.
- Pickup magnet radius 24 px × `stats.pickupRadiusMul`.

## Review Focus

- Pausing for 10 minutes must not inflate `durationSec` (anti-cheat minimums depend on honest time).
- Opening a chest with the inventory full drops the chest weapon on the floor next to the chest when declined; nothing is lost.
- Energy orbs at full energy stay on the floor (do not vanish); health capsules at full HP stay too.
- Abandoning from Pause produces a valid `RunResult` (`victory: false`) that passes `validateRun`.
- A weapon chest never offers a weapon the player currently holds in either slot, unless the pool has nothing else.

## File Structure

```
apps/web/src/game/
  logic/run/runState.ts, runState.test.ts
  logic/run/summary.ts, summary.test.ts
  logic/loot/tables.ts, tables.test.ts
  entities/Pickup.ts, entities/Crate.ts, entities/Chest.ts
  systems/PickupSystem.ts, systems/LootSystem.ts
```

---

### Task 1: RunState and RunSummary

**Interfaces:**

- Consumes: `RunConfig` (plan 03), `RunResult`, `validateRun` (plan 02).
- Produces:

```ts
interface RunState {
  config: RunConfig; sector: SectorId; roomsCleared: number; bossesKilled: number; kills: number;
  scrap: number; scrapEarned: number; mods: ModId[]; logsFound: LogId[]; activeMs: number;
  outcome: 'running' | 'victory' | 'death' | 'abandon';
}
createRunState(config: RunConfig): RunState
tickTime(s: RunState, dtMs: number, paused: boolean): void
onRoomCleared(s: RunState): void
onKill(s: RunState): void
onBossKilled(s: RunState, boss: BossId): void      // 'core-warden' sets outcome 'victory'
addScrap(s: RunState, n: number): void
spendScrap(s: RunState, n: number): boolean
addMod(s: RunState, id: ModId): void
addLog(s: RunState, id: LogId): boolean            // false if already found this run
advanceSector(s: RunState): void                   // 1→2→3, throws past 3
endRun(s: RunState, outcome: 'death' | 'abandon'): void
toRunResult(s: RunState): RunResult
toRunSummary(s: RunState): RunSummary              // { result, outcome, scrapEarned, newLogIds }
```

- [ ] **Step 1: Tests:** paused time does not accumulate; `toRunResult` after clearing 5 rooms and the Gatekeeper reports `sectorReached: 1, bossesKilled: 1`; after `advanceSector` → `sectorReached: 2`; Warden kill → `victory: true`, `bossesKilled: 3`; a fresh state abandoned immediately passes `validateRun`; `newLogIds` excludes logs in `config.collectedLogIds`; `spendScrap` all-or-nothing.
- [ ] **Step 2:** `vp test src/game/logic/run` → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): run state and summary`.

### Task 2: Loot tables

**Interfaces:**

- Produces:
  - `RARITY_WEIGHTS = { common: 70, rare: 25, epic: 5 }` (starter never rolls from chests)
  - `rollChestWeapon(rng: Rng, pool: readonly WeaponId[], held: readonly WeaponId[], luck: number): WeaponId` — `luck` shifts weight: rare +10×luck, epic +5×luck, common −15×luck (floor 10)
  - `rollGuardianDrop(rng, def: Guardian, elite: boolean): { scrap: number; energyOrbs: number; health: boolean }` — scrap = `def.scrap` (+2 elite); energy orb with `def.energyOrbChance` (elite: guaranteed 1); health capsule 3%
  - `rollCrate(rng): { scrap: number; energyOrbs: number }` — 1–3 scrap, 40% one orb
  - `roomClearReward(sector: SectorId): { scrap: number }` — `3 + sector`
  - `isGoldChest(rng, sector: SectorId): boolean` — 25% (plan 13 consumes)

- [ ] **Step 1: Tests:** over 10 000 rolls with an all-rarity pool, rarity frequencies within ±2% of weights; with `luck: 1` rare frequency rises; a pool of only held weapons still returns one of them; an unlocked-epic-free pool never returns an epic; elite drop always has ≥ 1 orb; same seed + same call order → same results.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. Set `energyOrbChance` in `guardians.json` (drone 0.35, crawler 0.25, turret 0.4, others 0.4). **Step 4:** → PASS. **Step 5:** Commit `feat(logic): loot tables`.

### Task 3: Pickups, crates and chests in the world

**Interfaces:**

- Produces:
  - `type PickupKind = 'energy' | 'scrap' | 'health'`; `class PickupSystem { constructor(scene, player, run: RunState); spawn(kind, x, y, amount): void; update(now, dt): void }` (pool 128; magnet within radius accelerates to the player; energy orb restores 12 energy, health capsule 1 HP, scrap adds its amount; emits `pickup:collected { kind, amount }`)
  - `class Crate` (destructible, 3 HP, breaks into `rollCrate`), `class Chest { kind: 'weapon' | 'gold'; open(): void }` (E to open; weapon chest spawns a `WeaponPickup` from `rollChestWeapon`; gold handled in plan 13)
  - `class LootSystem` subscribes to `guardian:killed`, `room:cleared` and spawns drops; spawns crates at `crate` spawn points when a room is built.

- [ ] **Step 1:** Implement; on `room:cleared` also `onRoomCleared(run)` and the room-clear Scrap burst; on `guardian:killed` call `onKill(run)`.
- [ ] **Step 2:** `DungeonScene.update` calls `tickTime(run, delta, pausedByPlayer)`. Player death → `endRun(run, 'death')`, 1.2 s slow-motion death beat, then `bus.emit('run:ended', toRunSummary(run))`. Pause → Abandon (confirm dialog) → `endRun(run, 'abandon')` → emit.
- [ ] **Step 3: Verify manually:** clear a room → Scrap burst magnetises; open the chest → weapon on the floor; full energy → orbs stay; die → React results screen shows the JSON summary with the seed.
- [ ] **Step 4:** Commit `feat(game): pickups, crates, chests, run end flow`.

## Acceptance

- [ ] The JSON `RunSummary` from a real run passes `validateRun` (log a warning in DEV if not).
- [ ] Same seed and same play order gives the same chest weapons.
