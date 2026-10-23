# 13 · Vault Mods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All 10 Vault Mods working through one effects pipeline, a 1-of-3 pick overlay, gold chests that offer a pick, and the mod pool respecting Armory unlocks.

**Architecture:** Stat effects already compose in `deriveStats` (plan 04). This plan adds the choice roll, the runtime for flags and hooks (`bulletsBounce`, `thornContact`, `onBossKilled`), and the `ModPick` HUD overlay. Applying a mod = `addMod(run)` → `deriveStats` → `applyStatChange` → `player.setStats`.

**Tech Stack:** TypeScript, Phaser 4 HUD overlay.

**Milestone:** M3 · **Depends on:** 04, 12 · **Spec:** `DESIGN.md` §6.2, §15 D8; PRD "Vault Mods", "Armory unlocks", "Room types" (Chest, Lift)

## Global Constraints

- Pick 1 of 3 at the Lift after each sector boss and from gold chests. Combat does not pause during a gold-chest pick (the room is already cleared, so it is safe), but input to the world is suspended while the overlay is open.
- Mod pool = `modPool(config.unlockedModIds)`: base 7 plus purchased Thorn Plating, Lucky Seal, Dash Coil.
- Mods stack (two Cooling Fins = ×1.44). Choices in one roll are distinct.
- Lucky Seal sets `chestLuck` +1 per copy (used by `rollChestWeapon`).

## Review Focus

- A pool with fewer than 3 mods (heavy stacking is allowed, so this only happens with a broken pool) must still offer what exists, minimum 1.
- At 1 max HP, Overclock Core (−1 max HP) must not be offered: exclude any mod whose application would push `maxHp` below 1.
- Ricochet Chip must apply to weapons already held and to weapons picked up later (it reads stats at fire time).
- Thorn Plating must not damage guardians during the player's i-frames twice in one contact (once per 500 ms per guardian).
- Closing the overlay without choosing (Esc) is not allowed at the Lift; at a gold chest it leaves the chest open and re-openable.

## File Structure

```
apps/web/src/game/
  logic/mods/choices.ts, choices.test.ts
  logic/mods/hooks.ts, hooks.test.ts
  systems/ModSystem.ts
  hud/ModPick.ts
```

---

### Task 1: Mod choices

**Interfaces:**

- Produces: `rollModChoices(rng: Rng, pool: readonly ModId[], stats: PlayerStats, n = 3): ModId[]` (distinct, excludes lethal picks, returns `min(n, eligible)`).

- [ ] **Step 1: Tests:** returns 3 distinct ids from a 7-id pool; never includes `thorn-plating` when not unlocked; with `stats.maxHp === 1` never includes `overclock-core`; same rng label → same choices; pool of 2 → 2 choices.
- [ ] **Step 2:** `vp test src/game/logic/mods` → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): vault mod choices`.

### Task 2: Flags and hooks runtime

**Interfaces:**

- Produces:
  - `onBossKilledEffects(stats: PlayerStats): { heal: number }` (sum of Field Patch values)
  - `thornDamage(stats: PlayerStats): number` (1 per Thorn Plating copy, 0 without)
  - `class ModSystem { constructor(scene, player, run, guardians); apply(id: ModId): void; update(now): void }` — on `boss:dead` heals via `heal()`; on guardian contact deals `thornDamage` with a 500 ms per-guardian limiter; Ricochet is already read by `BulletBehaviour` through `stats.flags`.

- [ ] **Step 1: Tests:** Field Patch ×2 → heal 2; no Thorn Plating → 0.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5: Verify in sandbox** via `window.__dh.giveMod(id)` for each of the 10 mods: fire rate, shield, energy, damage/HP, ricochet, magnet radius, dash charges (HUD shows two pips), Field Patch heal on boss kill (sandbox dummy boss), Thorn contact damage, Lucky Seal (chest rarity counts over 50 chest rolls in the console).
- [ ] **Step 6:** Commit `feat(game): mod effects runtime`.

### Task 3: ModPick overlay and gold chests

**Interfaces:**

- Produces: `ModPick.open(choices: ModId[], opts: { cancellable: boolean }): Promise<ModId | null>`; gold chest (`Chest.kind === 'gold'`, chosen by `isGoldChest`) opens `ModPick` with `cancellable: true` and a gold `scrap` trim.

- [ ] **Step 1:** Overlay: three 96×120 cards (icon, name, one-line effect from `mods.json`), keyboard 1/2/3 or A/D + E, mouse click, gamepad D-pad + X. Selected card bumps; confirm applies via `ModSystem.apply`.
- [ ] **Step 2:** While open, `InputSystem` output to the world is zeroed (no firing through the menu).
- [ ] **Step 3: Verify manually:** gold chest → 3 cards → pick → effect visible; Esc on a gold chest closes, chest re-opens on E.
- [ ] **Step 4:** Commit `feat(game): mod pick overlay and gold chests`.

## Acceptance

- [ ] All 10 mods have a visible, correct effect; the pool honours unlocks.
