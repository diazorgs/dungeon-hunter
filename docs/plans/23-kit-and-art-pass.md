# 23 · Kit and Original Art Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second Runner, Kit the Tinker, with the Patch Drone skill and Armory unlock, replace prototype art for the Runners and the three bosses with original pixel art, lock the UI font, and close M5 with a first-time-player hallway test.

**Architecture:** Kit is one `Skill` implementation (`PatchDrone`) plus a `Drone` entity reusing `BulletPool`, `assistAngle('full')` targeting and the guardian target provider. Art flows Aseprite → JSON atlas → `public/assets/sprites/` with a loader manifest so swapping art changes no game code (only `content/textures.ts` keys).

**Tech Stack:** Aseprite/LibreSprite, Phaser 4 atlases and animations, TypeScript.

**Milestone:** M5 · **Depends on:** 05, 22 · **Spec:** PRD "Runners" (Kit), "Art and audio direction", "Asset plan", M5 row, cut order #1; `DESIGN.md` §11.1–§11.3

## Global Constraints

- Kit: HP 5, Shield 5, Energy 200; **Patch Drone**: deploys a turret that auto-fires for 8 s, cooldown 22 s; unlock 300 Core Shards.
- Sprite sizes: Runners 16×24; bosses 64×64 to 96×96. Palette: the 32 colours only.
- No Soul Knight sprites, names, or recognisable character designs.
- Cut order #1: dropping Kit = skip Tasks 1–2 and hide runner cards in the Armory; nothing else changes.

## Review Focus

- Deploying the drone inside a wall or outside the room must place it at the nearest free floor tile next to the player.
- Room clear or sector transition while a drone is active removes it cleanly (no orphan timers firing into the next sector).
- The drone must not target guardians behind walls or keep firing at a dying boss during the death sequence.
- Kit selected in Staging Bay but the profile no longer owns Kit (e.g. local data reset) must fall back to Vex, not crash `buildRunConfig`.
- An animation key missing from a new atlas must fall back to the placeholder frame with one warning, not break the scene.

## File Structure

```
apps/web/src/game/
  systems/skills/PatchDrone.ts
  entities/Drone.ts
  content/textures.ts, content/animations.ts, content/manifest.ts
art/                                     # source .aseprite files (repo root, not shipped)
scripts/export-art.sh                    # aseprite CLI → public/assets/sprites/*.png|json
apps/web/public/assets/sprites/runners.{png,json}, bosses.{png,json}
apps/web/public/assets/fonts/ui.woff2, ui.fnt, ui.png
docs/playtests/m5-hallway.md
```

---

### Task 1: Patch Drone skill (cut order #1)

**Interfaces:**

- Consumes: `Skill`, `SkillContext`, `BulletPool`, `GuardianSystem.targets()`, `assistAngle`.
- Produces: `class PatchDrone implements Skill` (id `patch-drone`, `cooldownMs: 22000`); `class Drone extends Phaser.GameObjects.Sprite { constructor(scene, x, y, opts: { durationMs: 8000; fireRate: 5; damage: 2; range: 120; bulletSpeed: 260 }); update(now, dt): void; expire(): void }`; `createSkill` returns `PatchDrone` for `kit`.

- [ ] **Step 1:** Implement: spawn beside the player (free-tile search), hover bob, target = `assistAngle(drone, drone, targets, 'full', prevAngle)` limited to `range`; fire from the player bullet pool; expire after 8 s with a small pop; listen to `room:cleared`/`sector:entered`/`boss:dead` to expire early.
- [ ] **Step 2: Verify in sandbox** (`?scene=sandbox&runner=kit`; add `runner` to `parseDevParams`): drone fires at visible enemies only, lasts 8 s, cooldown 22 s on the HUD ring.
- [ ] **Step 3:** Commit `feat(game): kit patch drone`.

### Task 2: Kit in the meta loop

- [ ] **Step 1: Test** (`profile/runConfig.test.ts`): `buildRunConfig` with `runnerId: 'kit'` and no unlock falls back to `vex` (change from plan 22's throw, and update that test).
- [ ] **Step 2:** → FAIL → implement → PASS.
- [ ] **Step 3:** Staging Bay shows Kit's stats and skill text; Armory card unlocks Kit for 300.
- [ ] **Step 4:** Commit `feat(ui): kit unlock and selection`.

### Task 3: Art pipeline and original Runner + boss art

**Interfaces:**

- Produces: `content/manifest.ts` listing atlases to load; `content/animations.ts` defining animation keys `runner.<id>.<idle|run|dash|hurt|death>`, `boss.<id>.<idle|attack|stunned|death>` (plus `hydra.head.<id>`, `warden.arm`); `scripts/export-art.sh` runs `aseprite -b <file> --sheet ... --data ... --format json-array --list-tags`.

- [ ] **Step 1:** Draw Vex and Kit (16×24; distinct silhouettes: Vex heavy breacher armour with amber visor, Kit lighter with a tool pack and drone dock), 5 tagged animations each.
- [ ] **Step 2:** Draw Gatekeeper (96×64 tank), Conduit Hydra core (64×64) + 3 heads (32×32), Core Warden (96×96) + arms; Warden and Sector 3 assets lean on `bleed-*` colours.
- [ ] **Step 3:** Export, register, delete the replaced placeholder frames. A test in `content/manifest.test.ts` asserts every `textureFor` key used by `RUNNERS` and `BOSSES` exists in the manifest's frame list (parse exported JSON with `node:fs`).
- [ ] **Step 4:** Commit `art: original runners and bosses`.

### Task 4: Font lock and credits

- [ ] **Step 1:** Choose the final pixel font (OFL/CC0). Generate `ui.fnt/ui.png` at 8 and 16 px (e.g. with a BMFont-compatible exporter) for Phaser BitmapText and `ui.woff2` for React from the same source.
- [ ] **Step 2:** Update `CREDITS.md` (fonts, any remaining packs, SFX) and the Ending credits list.
- [ ] **Step 3:** Commit `art: final ui font and credits`.

### Task 5: M5 hallway test (gate)

- [ ] **Step 1:** Write `docs/playtests/m5-hallway.md`: 3–5 people who have never seen the game start from a cleared localStorage with no verbal help. Record: did they read the intro, do they know the goal after Sector 1 (ask: "What are you trying to do?"), did they find the Armory, did they understand Core Shards.
- [ ] **Step 2:** Fix any blocker for "understands the goal without explanation" (usually: intro card copy, Ops briefing, Staging Bay labelling).
- [ ] **Step 3:** Commit `docs: m5 hallway test`.

## Acceptance (M5 gate)

- [ ] Kit playable after unlock; Patch Drone per PRD numbers.
- [ ] Runners and bosses use original art; no prototype art in those slots.
- [ ] First-time players state the goal without explanation.
