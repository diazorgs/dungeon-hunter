# 08 · Combat Feel and SFX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the PRD's entire combat-feel checklist in M1: per-weapon screen shake, hit flash + knockback, hit-stop, muzzle flash, shell casings, impact sparks, pitch-randomized SFX per weapon type, custom crosshair, optional damage numbers. Close M1 with a three-tester gun-feel playtest.

**Architecture:** `systems/JuiceSystem.ts` listens to scene events (`weapon:fired`, `guardian:hit`, `guardian:killed`, `player:damaged`, bullet wall hits) and renders effects; it never changes gameplay state except the hit-stop timescale. Rate limiting and scaling math is pure (`logic/juice.ts`). `systems/AudioSystem.ts` wraps Phaser sound with pitch jitter and a per-key voice cap.

**Tech Stack:** Phaser 4 (cameras, particles, tint modes, sound), TypeScript.

**Milestone:** M1 (never cut) · **Depends on:** 05, 06, 07 · **Spec:** `DESIGN.md` §11.6, §11.7; PRD "Combat feel checklist", "Audio"

## Global Constraints

- Hit flash: 50 ms `setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)`, then restore the previous tint and mode (Bleed tint must survive a flash).
- Hit-stop: 30 ms, on boss hits (max one per 120 ms) and on elite/boss kills.
- Shake = weapon `shake` × `settings.screenShake`; 0 disables.
- Every SFX ±5% pitch. Damage numbers off by default.
- HUD scene is separate, so camera shake never moves the HUD.

## Review Focus

- Rapid-fire SMG must not stack shake into a permanent wobble: new shake replaces only when stronger than the remaining one.
- Hit-stop must not freeze HUD timers, radio fades or the pause overlay (only `dungeon` time/physics scale).
- A flash in progress when the guardian dies must not leave a white corpse sprite or a dangling timer on a destroyed object.
- Audio context locked until first user gesture: the first shot after load must still play (resume on first pointerdown/keydown).
- `screenShake: 0` and `sfxVolume: 0` must fully disable, not just reduce.

## File Structure

```
apps/web/src/game/
  logic/juice.ts, juice.test.ts
  systems/JuiceSystem.ts
  systems/AudioSystem.ts
  systems/Crosshair.ts
  systems/DamageNumbers.ts
public/assets/audio/sfx/*.ogg (+ .mp3 fallback), CREDITS.md entries
docs/playtests/m1-gun-feel.md       # created in Task 5
```

---

### Task 1: Pure juice helpers

**Interfaces:**

- Produces:
  - `scaledShake(weapon: { shake: { intensity: number; durationMs: number } }, setting: number): { intensity: number; durationMs: number } | null` (null when setting is 0)
  - `shouldReplaceShake(current: { intensity: number; endsAt: number } | null, next: { intensity: number }, now: number): boolean`
  - `createRateLimiter(minGapMs: number): (now: number) => boolean`
  - `jitterRate(rand: () => number, amount = 0.05): number` (in [0.95, 1.05])

- [ ] **Step 1: Tests:** `scaledShake(w, 0) === null`; `scaledShake(w, 0.5).intensity === w.shake.intensity / 2`; weaker shake does not replace an active stronger one, does after it ends; limiter at 120 ms allows t=0, rejects t=119, allows t=120; `jitterRate(() => 0)` = 0.95, `(() => 1 - ε)` < 1.05.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. Set the `shake` values in `weapons.json` (field defined by plan 02's `WeaponSchema`): SMG `0.002/40`, pistol `0.003/50`, shotgun `0.006/90`, rifle `0.004/60`, launcher `0.01/120` (the rest set in plan 17). **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(logic): juice helpers`.

### Task 2: JuiceSystem (shake, flash, knockback, hit-stop)

**Interfaces:**

- Consumes: scene events from plans 06–07; `Settings`.
- Produces: `class JuiceSystem { constructor(scene, settings: Settings); hitStop(ms: number): void; tickHitStop(realNow: number): void; flash(target: Phaser.GameObjects.Sprite, ms = 50): void; destroy(): void }`; consumes new scene event `player:damaged { shieldLost, hpLost }` (emitted by Player when `applyDamage` is not ignored).

- [ ] **Step 1:** Shake on `weapon:fired` via `camera.shake(durationMs, intensity)` respecting `shouldReplaceShake`. On `player:damaged` with `hpLost > 0`: shake `0.008/120` and a 150 ms `hp-dark` vignette (HUD-side, plan 11 hook: emit `hud:vignette`).
- [ ] **Step 2:** Flash on `guardian:hit`, guarded by `target.active`; stores and restores prior tint + tint mode; cancels its timer on target `destroy`.
- [ ] **Step 3:** Hit-stop: `physics.world.pause()`, `scene.time.paused = true`, pause the dungeon's tweens; record `resumeAt = performance.now() + ms`. `HudScene.update` (which keeps running) calls `juice.tickHitStop(performance.now())` to resume. Overlapping requests extend `resumeAt`, never shorten. Boss hits go through the 120 ms limiter. Do not let a hit-stop resume a world the player paused with Esc (track the two pause reasons separately).
- [ ] **Step 4: Verify in sandbox:** shoot a crawler → white flash and visible knockback; set `screenShake` to 0 via `window.__dh` → no shake.
- [ ] **Step 5:** Commit `feat(game): shake, flash, hit-stop`.

### Task 3: Particles, muzzle flash, casings, crosshair, damage numbers

**Interfaces:**

- Produces: `class Crosshair { constructor(scene); update(pointerWorld: Vec2, device: 'kbm' | 'pad', aimPoint: Vec2): void }`; `class DamageNumbers { constructor(scene, enabled: boolean); show(x, y, n): void }` (pool 64 BitmapText).

- [ ] **Step 1:** Three emitters created once: sparks (impact, 4–6 particles, `amber-100`→`amber-500`), casings (1 per shot for ballistic weapons, arc + fade 400 ms), death burst (8–12 particles, `steel-300` + guardian accent). Use `emitter.explode(n, x, y)` only.
- [ ] **Step 2:** Muzzle flash: one pooled sprite shown for 1 frame at the barrel, rotated to aim, `amber-100`.
- [ ] **Step 3:** Crosshair sprite (9×9) at pointer world position with depth 7000; with gamepad, draw at the aim point. Canvas CSS already `cursor: none` (plan 03).
- [ ] **Step 4:** Damage numbers when `settings.damageNumbers`: rise 12 px over 400 ms, fade.
- [ ] **Step 5:** Commit `feat(game): particles, muzzle flash, casings, crosshair, damage numbers`.

### Task 4: AudioSystem and weapon SFX

**Interfaces:**

- Produces: `class AudioSystem { constructor(scene, settings: Settings); play(key: string, opts?: { pitchJitter?: number; volume?: number }): void; setVolumes(music: number, sfx: number): void; playMusic(key: string, fadeMs = 800): void }`; SFX keys: `sfx.pistol`, `sfx.smg`, `sfx.shotgun`, `sfx.rifle`, `sfx.burst`, `sfx.beam-loop`, `sfx.melee`, `sfx.launcher`, `sfx.charge`, `sfx.chain`, `sfx.dryfire`, `sfx.hit`, `sfx.enemy-death`, `sfx.player-hurt`, `sfx.shield-break`, `sfx.dash`, `sfx.door-lock`, `sfx.door-unlock`, `sfx.pickup`, `sfx.vigil-alarm`. `weapons.json` `sfx` field holds the key.

- [ ] **Step 1:** `play` applies `jitterRate` to `rate`, caps at 4 concurrent instances per key (stop oldest), multiplies by `sfxVolume`, returns silently when volume is 0.
- [ ] **Step 2:** Unlock: on first `pointerdown`/`keydown`, resume the Web Audio context if suspended.
- [ ] **Step 3:** Source placeholder SFX (CC0, e.g. generated with jsfxr/ChipTone; log in CREDITS.md). Wire `weapon:fired`, `weapon:dryfire`, `guardian:hit`, `guardian:killed`, `player:damaged`, `player:dashed`.
- [ ] **Step 4: Verify:** 10 rapid pistol shots sound varied, not robotic; SMG at max rate never exceeds 4 voices (check `scene.sound.getAll('sfx.smg').length`).
- [ ] **Step 5:** Commit `feat(game): audio system with pitch jitter`.

### Task 5: M1 gun-feel playtest (gate)

- [ ] **Step 1:** Write `docs/playtests/m1-gun-feel.md`: protocol (5 minutes in sandbox with 3 weapons, crawlers and drones, then questions: "Does shooting feel good? Which gun feels best/worst and why? Did anything feel delayed?"), and a results table per tester.
- [ ] **Step 2:** Run with 3 testers. Record answers. Fix any "feels flat" item before M2 (PRD risk mitigation).
- [ ] **Step 3:** Run the stress test on the reference mid-range laptop: 300 bullets, 20 guardians, all juice on, ≥ 58 fps sustained for 60 s. Record the numbers in the same file.
- [ ] **Step 4:** Commit `docs: m1 gun-feel playtest results`.

## Acceptance (M1 gate)

- [ ] Every PRD combat-feel checklist item is visible in sandbox.
- [ ] 3 testers say shooting a Crawler feels good; 300 bullets at 60 fps.
