import { WEAPONS } from "@dh/shared";
import type { Settings, WeaponId } from "@dh/shared";
import Phaser from "phaser";
import { createRateLimiter, scaledShake, shouldReplaceShake } from "../logic/juice.ts";
import type { AudioSystem } from "./AudioSystem.ts";
import type { DamageNumbers } from "./DamageNumbers.ts";

const FLASH_MS = 50;
const HIT_STOP_MS = 30;
const BALLISTIC = new Set(["bullet", "burst", "pierce", "bounce"]);

type Tintable = Phaser.GameObjects.Sprite;

/**
 * Turns scene events into feel: shake, flash, hit-stop, particles, muzzle flash and SFX.
 * Only hit-stop touches gameplay (it freezes physics, timers and tweens briefly).
 */
export class JuiceSystem {
  private readonly scene: Phaser.Scene;
  private readonly settings: Settings;
  private readonly audio: AudioSystem;
  private shake: { intensity: number; endsAt: number } | null = null;
  private resumeAt = 0;
  private stopped = false;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly casings: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly muzzle: Phaser.GameObjects.Image;
  private muzzleFrame = -1;

  constructor(scene: Phaser.Scene, settings: Settings, audio: AudioSystem, numbers: DamageNumbers) {
    this.scene = scene;
    this.settings = settings;
    this.audio = audio;

    // Three emitters for the whole scene; effects only ever call explode().
    this.sparks = scene.add
      .particles(0, 0, "ph-spark", {
        emitting: false,
        lifespan: 180,
        speed: { min: 40, max: 110 },
        scale: { start: 1, end: 0 },
        color: [0xfde3a7, 0xe08a2e],
      })
      .setDepth(6000);
    this.casings = scene.add
      .particles(0, 0, "ph-casing", {
        emitting: false,
        lifespan: 400,
        speed: { min: 30, max: 60 },
        angle: { min: 200, max: 340 },
        rotate: { min: 0, max: 360 },
        alpha: { start: 1, end: 0 },
      })
      .setDepth(5500);
    this.debris = scene.add
      .particles(0, 0, "ph-spark", {
        emitting: false,
        lifespan: 350,
        speed: { min: 30, max: 120 },
        scale: { start: 1.5, end: 0 },
        color: [0xa9b8d1, 0xff4fbf],
      })
      .setDepth(6000);
    this.muzzle = scene.add.image(0, 0, "ph-muzzle").setDepth(6000).setVisible(false);

    const on = (e: string, fn: (d: never) => void) => scene.events.on(e, fn, this);
    on("weapon:fired", (d: { weaponId: WeaponId; x: number; y: number; angle: number }) =>
      this.onFired(d),
    );
    on("weapon:dryfire", () => audio.play("sfx.dryfire"));
    on("guardian:hit", (d: { x: number; y: number; dmg: number; target: Tintable }) => {
      this.flash(d.target);
      this.sparks.explode(Phaser.Math.Between(4, 6), d.x, d.y);
      numbers.show(d.x, d.y, d.dmg);
      audio.play("sfx.hit");
    });
    on("guardian:killed", (d: { x: number; y: number; elite: boolean }) => {
      this.debris.explode(Phaser.Math.Between(8, 12), d.x, d.y);
      audio.play("sfx.enemy-death");
      if (d.elite) this.hitStop(HIT_STOP_MS);
    });
    const bossHitStop = createRateLimiter(120);
    on("boss:hit", (d: { x: number; y: number; dmg: number; target: Tintable }) => {
      this.flash(d.target);
      this.sparks.explode(5, d.x, d.y);
      numbers.show(d.x, d.y, d.dmg);
      audio.play("sfx.hit");
      if (bossHitStop(performance.now())) this.hitStop(HIT_STOP_MS);
    });
    on("boss:dead", (d: { x: number; y: number }) => {
      for (let i = 0; i < 4; i++)
        this.debris.explode(
          12,
          d.x + Phaser.Math.Between(-16, 16),
          d.y + Phaser.Math.Between(-16, 16),
        );
      audio.play("sfx.enemy-death");
      const s = scaledShake(
        { shake: { intensity: 0.01, durationMs: 300 } },
        this.settings.screenShake,
      );
      if (s) this.shakeCamera(s);
    });
    on("weapon:blast", (d: { x: number; y: number; radius: number }) => {
      const ring = scene.add.circle(d.x, d.y, d.radius, 0xfde3a7, 0.5).setDepth(6000);
      scene.tweens.add({
        targets: ring,
        alpha: 0,
        scale: 1.2,
        duration: 160,
        onComplete: () => ring.destroy(),
      });
      this.sparks.explode(10, d.x, d.y);
      const s = scaledShake(
        { shake: { intensity: 0.01, durationMs: 120 } },
        this.settings.screenShake,
      );
      if (s) this.shakeCamera(s);
    });
    on("bullet:wall", (d: { x: number; y: number }) => this.sparks.explode(4, d.x, d.y));
    on("player:damaged", (d: { shieldLost: number; hpLost: number }) => {
      if (d.hpLost > 0) {
        const hurt = scaledShake(
          { shake: { intensity: 0.008, durationMs: 120 } },
          this.settings.screenShake,
        );
        if (hurt) this.shakeCamera(hurt);
        scene.events.emit("hud:vignette");
        audio.play("sfx.player-hurt");
      } else audio.play("sfx.shield-break", { volume: 0.6 });
    });
    on("player:dashed", () => audio.play("sfx.dash"));
    on("skill:activated", (d: { x: number; y: number }) => {
      const ring = scene.add.circle(d.x, d.y, 10, 0xf5b95a, 0).setStrokeStyle(2, 0xf5b95a);
      ring.setDepth(6000);
      scene.tweens.add({
        targets: ring,
        scale: 2.5,
        alpha: 0,
        duration: 260,
        onComplete: () => ring.destroy(),
      });
      this.sparks.explode(12, d.x, d.y);
      audio.play("sfx.charge", { volume: 0.6 });
    });
    // A press that cannot act (skill cooling down, no second weapon) still clicks.
    on("skill:notready", () => audio.play("sfx.dryfire"));
    on("weapon:swapfail", () => audio.play("sfx.dryfire"));
    on("weapon:swapped", () => audio.play("sfx.pickup", { volume: 0.4 }));
    on("room:locked", () => audio.play("sfx.door-lock"));
    on("pickup:collected", () => audio.play("sfx.pickup", { volume: 0.5 }));
    on("room:cleared", () => audio.play("sfx.door-unlock"));
  }

  get hitStopped(): boolean {
    return this.stopped;
  }

  /** Freeze the world for `ms`; overlapping requests extend, never shorten. */
  hitStop(ms: number): void {
    this.resumeAt = Math.max(this.resumeAt, performance.now() + ms);
    if (this.stopped) return;
    this.stopped = true;
    this.scene.physics.world.pause();
    this.scene.time.paused = true;
    this.scene.tweens.pauseAll();
  }

  /** Called every frame with real time; the scene's own clock is frozen during hit-stop. */
  tickHitStop(realNow: number): void {
    if (this.muzzle.visible && this.scene.game.loop.frame > this.muzzleFrame)
      this.muzzle.setVisible(false);
    if (!this.stopped || realNow < this.resumeAt) return;
    this.stopped = false;
    this.scene.physics.world.resume();
    this.scene.time.paused = false;
    this.scene.tweens.resumeAll();
  }

  /** 50 ms white flash that restores the previous tint (e.g. Bleed magenta). */
  flash(target: Tintable, ms = FLASH_MS): void {
    if (!target.active) return;
    const prev = target.isTinted ? { tint: target.tint, mode: target.tintMode } : null;
    target.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => {
      if (!target.scene) return; // destroyed meanwhile
      if (prev) target.setTint(prev.tint).setTintMode(prev.mode);
      else target.clearTint();
    });
  }

  private onFired(d: { weaponId: WeaponId; x: number; y: number; angle: number }): void {
    const weapon = WEAPONS[d.weaponId];
    const shake = scaledShake(weapon, this.settings.screenShake);
    if (shake) this.shakeCamera(shake);
    this.muzzle.setPosition(d.x, d.y).setRotation(d.angle).setVisible(true);
    this.muzzleFrame = this.scene.game.loop.frame;
    if (BALLISTIC.has(weapon.behaviour)) this.casings.explode(1, d.x, d.y);
    this.audio.play(weapon.sfx);
  }

  private shakeCamera(s: { intensity: number; durationMs: number }): void {
    const now = performance.now();
    if (!shouldReplaceShake(this.shake, s, now)) return;
    this.shake = { intensity: s.intensity, endsAt: now + s.durationMs };
    this.scene.cameras.main.shake(s.durationMs, s.intensity, true);
  }
}
