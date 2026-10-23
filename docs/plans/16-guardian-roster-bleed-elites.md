# 16 · Guardian Roster, Bleed Variants and Elites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The remaining four guardians (Shield Bot, Arc Spider, Mortar Unit, Bleed Wraith), a shared hazard-zone system, the Bleed variant modifier for Sector 3, and elites for every sector.

**Architecture:** Each guardian is one `AiController` registered by `ai` key (plan 07). Lingering damage (spider trails, mortar blasts, Bleed puddles, later the Warden's electrified floor) goes through one pooled `HazardSystem`. Bleed and elite are spawn options, never subclasses: stat multipliers + a visual treatment applied in `Guardian` construction.

**Tech Stack:** Phaser 4 (Filters, tint modes, Arcade), TypeScript.

**Milestone:** M4 · **Depends on:** 07, 15 · **Spec:** `DESIGN.md` §7.1; PRD "Guardian machines", "Bleed variants", "Elites"

## Global Constraints

- Bleed variant: magenta tint, +40% HP, faster bullets (×1.25), short-lived damaging puddle on death (1 dmg, 2 s). One visual treatment + stat multiplier, no new art.
- Elite: bigger (×1.5 scale), ×2 HP, guaranteed energy orb, max 1 per room.
- Elites and Bleed stack (a Bleed elite is ×2.8 HP).
- Use Phaser 4 Filters / tint modes (read `.claude/skills/pnpm-phaser-filters-and-postfx/SKILL.md` before writing the Bleed visual).

## Review Focus

- Shield Bot must still take damage from explosions (area damage ignores the shield) and from behind; bouncing bullets that hit from the side count as flank hits.
- Hazards must not damage the player during i-frames, and a player standing in two overlapping puddles takes 1 damage per tick, not 2.
- A Wraith teleport destination must be inside the room, on floor, and ≥ 48 px from the player.
- Mortar shells target the player's position at launch; a moving player is safe (shells do not home).
- Bleed puddles spawned in a doorway must not block the door from closing/opening (hazards have no physics body, overlap only).

## File Structure

```
apps/web/src/game/
  logic/ai/shield.ts, shield.test.ts
  logic/spawn/modifiers.ts, modifiers.test.ts
  systems/HazardSystem.ts
  systems/ai/ShieldAi.ts, SpiderAi.ts, MortarAi.ts, WraithAi.ts
  systems/visuals/bleed.ts
```

---

### Task 1: Spawn modifiers and shield math

**Interfaces:**

- Produces:
  - `spawnModifiers(opts: GuardianSpawnOpts): { hpMul: number; scale: number; bulletSpeedMul: number; guaranteedOrb: boolean; deathPuddle: boolean }`
  - `BLEED = { hpMul: 1.4, bulletSpeedMul: 1.25, puddleDamage: 1, puddleMs: 2000 }`, `ELITE = { hpMul: 2, scale: 1.5 }`
  - `ELITE_CHANCE: Record<SectorId, number> = { 1: 0.2, 2: 0.3, 3: 0.4 }` (per room, passed to `buildWaves` as `eliteChance`)
  - `blockedByShield(facing: number, incomingAngle: number, arcDeg: number): boolean` (true when the bullet travels into the front arc)

- [ ] **Step 1: Tests:** plain → all 1/false; Bleed elite → `hpMul` 2.8, `scale` 1.5, puddle true, orb true; a bullet travelling directly at the shield's face is blocked; from behind is not; at exactly half-arc it is blocked (inclusive).
- [ ] **Step 2:** `vp test src/game/logic` → FAIL. **Step 3:** Implement and route `Guardian` construction through `spawnModifiers`. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): bleed and elite modifiers, shield arc`.

### Task 2: Hazard system

**Interfaces:**

- Produces: `class HazardSystem { constructor(scene, player); spawn(kind: 'puddle' | 'arc-trail' | 'blast' | 'floor', x, y, opts: { radius?: number; w?: number; h?: number; damage: number; durationMs: number; delayMs?: number }): void; update(now): void; clear(): void }` — pool 96; delayed hazards show a telegraph until `delayMs` passes; damage to player at most once per 500 ms across all hazards (shared limiter), through `applyDamage`.

- [ ] **Step 1:** Implement with Graphics-drawn zones (puddle `bleed-500` 40% alpha, arc trail `teal-200` flicker, blast flash `amber-100`).
- [ ] **Step 2:** Wire Bleed death puddles from `guardian:killed` where `bleed`.
- [ ] **Step 3: Verify in sandbox:** overlapping puddles deal 1 per tick; dash through takes 0.
- [ ] **Step 4:** Commit `feat(game): hazard system and bleed puddles`.

### Task 3: Shield Bot, Arc Spider, Mortar Unit (Sector 2)

**Interfaces:**

- Produces controllers with `attack` params in `guardians.json`:
  - `shield-bot` (`ShieldAi`): `{ shieldArcDeg: 100, turnDegPerSec: 90, boltSpeed: 90, fireEveryMs: 2000 }` — advances slowly, shield faces the player with limited turn rate (flanking works); blocked bullets spark and die (bouncing bullets reflect instead).
  - `arc-spider` (`SpiderAi`): `{ dashSpeed: 160, dashMs: 400, restMs: 600, trailEveryMs: 80, trailMs: 2000, trailDamage: 1 }` — darts in short bursts, drops `arc-trail` hazards.
  - `mortar-unit` (`MortarAi`): `{ fireEveryMs: 2400, telegraphMs: 900, blastRadius: 20, blastDamage: 1, minRange: 48 }` — keeps distance, lobs at the player's current position with a `blast` hazard (`delayMs: 900`) and a shell arc sprite.

- [ ] **Step 1:** Implement each; add to the sandbox spawn list.
- [ ] **Step 2: Verify in sandbox:** each teaches its PRD lesson — Shield Bot "flank or use bouncing shots", Arc Spider "control space", Mortar "don't stand still".
- [ ] **Step 3:** Commit `feat(game): shield bot, arc spider, mortar unit`.

### Task 4: Bleed Wraith and Bleed visuals (Sector 3)

**Interfaces:**

- Produces:
  - `bleed-wraith` (`WraithAi`): `{ teleportEveryMs: 2800, fadeMs: 300, ringCount: 12, ringSpeed: 85, minPlayerDist: 48 }` — fade out, reappear at a valid floor point, ring of bullets after 250 ms.
  - `applyBleedVisual(sprite: Phaser.GameObjects.Sprite): void` — magenta treatment (tint mode + a subtle internal glow filter in `bleed-500`); survives hit flash (plan 08 restores tint and mode).
  - `buildWaves(…, { bleed: true })` in Sector 3 marks every non-wraith entry `bleed: true`.

- [ ] **Step 1:** Implement; Bleed bullets render with `bleed-500` outline instead of `bone` (still bright and outlined).
- [ ] **Step 2: Verify in sandbox** (`spawn=bleed:crawler,bleed-wraith`): Bleed crawler is magenta, tougher, leaves a puddle; Wraith teleports and rings; 20 Bleed guardians + 300 bullets ≥ 58 fps (filters are the perf risk; drop the glow if it costs > 2 ms).
- [ ] **Step 3:** Commit `feat(game): bleed wraith and bleed variants`.

## Acceptance

- [ ] All 7 guardians in game; each sector's encounter pool matches the PRD table.
- [ ] Elites appear at most once per room in every sector.
