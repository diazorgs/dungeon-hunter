# 11 · HUD and Minimap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The in-run HUD scene: minimap with fog and icons plus a Tab full map (M2), then HP/Shield/Energy bars, weapon slots, skill cooldown, Scrap, boss bar, radio box and damage vignette (M3).

**Architecture:** `HudScene` runs in parallel with `DungeonScene` and reads a `HudSource` interface each frame (same game instance, no bridge events). Minimap reveal state is pure (`logic/minimap.ts`). HUD widgets are small classes so plans 14, 21 only fill in the boss bar and radio box.

**Tech Stack:** Phaser 4 (BitmapText, Graphics, Containers), TypeScript.

**Milestone:** M2 (Tasks 1–2), M3 (Tasks 3–4) · **Depends on:** 03, 10 · **Spec:** `DESIGN.md` §11.3, §11.5; PRD "Minimap", "Screens and UX flow" (In run)

## Global Constraints

- HUD is its own scene, so camera shake never moves it. Coordinates are internal pixels on the 480×270 canvas.
- Fonts: BitmapText at 8 or 16 px only. Colours from `PALETTE` only.
- Minimap 64×48 at top-right, rooms as 8×6 cells; icons for chest, vendor, boss. Tab toggles full map.
- Do not redraw Graphics every frame: redraw a widget only when its value changed.

## Review Focus

- Tab held vs tapped: tapping toggles; the full map must close on Esc/pause and on entering a boss room.
- Max-value changes from mods (e.g. Spare Cell) must resize the bars, not overflow them.
- Energy display above 999 (Battery Pack stacking) must not overlap the next widget.
- Boss rooms: the minimap shows the boss icon only once the boss room is known (seen through an open door), not from the start.
- The HUD must survive `dungeon` restarting for a new sector (re-bind to the new `HudSource`, no duplicated widgets).

## File Structure

```
apps/web/src/game/
  logic/minimap.ts, minimap.test.ts
  scenes/HudScene.ts
  hud/HudSource.ts
  hud/Minimap.ts, hud/FullMap.ts
  hud/ResourceBars.ts, hud/WeaponSlots.ts, hud/SkillRing.ts, hud/ScrapCounter.ts
  hud/BossBar.ts, hud/RadioBox.ts, hud/Vignette.ts
```

---

### Task 1: Minimap model

**Interfaces:**

- Produces:
  - `interface MinimapCell { roomId: number; gx: number; gy: number; state: 'current' | 'visited' | 'known'; icon: 'chest' | 'vendor' | 'boss' | 'log' | null; doors: Dir[] }`
  - `minimapCells(layout: DungeonLayout, visited: ReadonlySet<number>, current: number | null): MinimapCell[]` — visited rooms and their direct neighbours are included; neighbours are `known`; unknown rooms are omitted; icons shown for `visited` and `known` rooms.

- [ ] **Step 1: Tests:** at start only Start (current) and its neighbours (known) appear; a boss room two steps away is absent until its neighbour is visited; icons appear on known rooms; `current: null` (in a corridor) keeps the last visited room as `visited`, none `current`.
- [ ] **Step 2:** `vp test src/game/logic/minimap.test.ts` → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): minimap model`.

### Task 2: HudScene, HudSource, minimap and full map (M2)

**Interfaces:**

- Produces:
  - `interface HudSource { player: Player; weapons: WeaponSystem; skills: SkillSystem; layout: DungeonLayout; visitedRooms: ReadonlySet<number>; currentRoom(): number | null; scrap(): number; sector: SectorId }`
  - `DungeonScene` registers itself: `this.registry.set('hudSource', source)` and emits `hud:rebind` after building a new sector.
  - `class Minimap { constructor(scene, x, y); render(cells: MinimapCell[]): void }`, `class FullMap` (centred 320×200 overlay, 50% `ink` backdrop, legend)

- [ ] **Step 1:** Implement; minimap re-renders only on `room:entered` and `hud:rebind`. Tab → `FullMap.toggle()`; closes on pause and `room:locked` in a boss room.
- [ ] **Step 2: Verify manually:** explore a seed; fog reveals correctly; Tab overlay matches the minimap; restarting the sector (debug key F8, DEV) leaves one minimap.
- [ ] **Step 3:** Commit `feat(game): hud scene with minimap and full map`.

### Task 3: Resource bars, weapon slots, skill ring, Scrap (M3)

**Interfaces:**

- Produces: `ResourceBars.update(c: CombatantState)`, `WeaponSlots.update(loadout: Loadout, energyCost: (id) => number)`, `SkillRing.update(progress: number, remainingSec: number)`, `ScrapCounter.update(n: number)`.

- [ ] **Step 1:** Bars: segmented for HP and Shield (one segment per point, `hp` / `shield` colours, empty segments `hp-dark` / `steel-700`); Energy as a continuous bar with a number (`energy`). Layout per DESIGN.md §11.5; bar width grows with max up to 96 px then compresses segments.
- [ ] **Step 2:** Weapon slots: two 24×16 frames with weapon icons, active frame `amber-500`, energy cost under each, rarity-coloured border.
- [ ] **Step 3:** Skill ring: 16 px ring filling clockwise; flashes `bone` when ready.
- [ ] **Step 4:** Scrap counter with a 120 ms bump tween on increase.
- [ ] **Step 5: Verify manually** in sandbox: take damage (shield drains first, then HP), swap weapons, use Overcharge, pick a Spare Cell via `window.__dh` debug → bars resize.
- [ ] **Step 6:** Commit `feat(game): hud resources, weapons, skill, scrap`.

### Task 4: Boss bar, radio box, vignette slots (M3)

**Interfaces:**

- Produces:
  - `BossBar.show(name: string, maxHp: number)`, `BossBar.update(hp: number, phaseMarkers?: number[])`, `BossBar.hide()`; listens to scene events `boss:spawned { name, maxHp, phaseMarkers }`, `boss:hp { hp }`, `boss:dead`.
  - `RadioBox.say(line: { speaker: 'ops' | 'vigil'; text: string; durationMs: number })` — queue, max 2 lines visible, typewriter 40 chars/s, fades out after `durationMs`; uses HUD scene time so it keeps running during hit-stop.
  - `Vignette.pulse(colour: number, ms: number)` on `hud:vignette`.

- [ ] **Step 1:** Implement the three widgets; RadioBox speaker tag `OPS` in `teal-200`, `VIGIL` in `bleed-300`.
- [ ] **Step 2: Verify manually:** a DEV key (F7) queues three lines; they type, stack two at a time, fade; combat continues meanwhile.
- [ ] **Step 3:** Commit `feat(game): boss bar, radio box, vignette`.

## Acceptance

- [ ] HUD readable at 1× scale (480×270) and at 4×.
- [ ] Minimap reveals as rooms are seen; icons for chest, vendor, boss; Tab works.
- [ ] HUD costs < 1 ms per frame (Phaser debug timing in sandbox).
