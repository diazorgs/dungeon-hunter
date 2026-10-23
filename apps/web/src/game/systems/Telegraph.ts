import { PALETTE } from "@dh/shared";
import Phaser from "phaser";

/** Attack warnings in bleed-500 (DESIGN.md: every boss attack is telegraphed ≥ 400 ms). */
export class Telegraph {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  line(from: { x: number; y: number }, angle: number, length: number, ms: number): void {
    const g = this.scene.add.graphics().setDepth(4000);
    g.lineStyle(2, PALETTE["bleed-500"]).lineBetween(
      from.x,
      from.y,
      from.x + Math.cos(angle) * length,
      from.y + Math.sin(angle) * length,
    );
    this.pulse(g, ms);
  }

  circle(x: number, y: number, r: number, ms: number): void {
    const g = this.scene.add.graphics().setDepth(4000);
    g.lineStyle(2, PALETTE["bleed-500"]).strokeCircle(x, y, r);
    this.pulse(g, ms);
  }

  /** Blink the target bleed-500, then restore. */
  flash(target: Phaser.GameObjects.Sprite, ms: number): void {
    target.setTint(PALETTE["bleed-500"]).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => target.scene && target.clearTint());
  }

  private pulse(g: Phaser.GameObjects.Graphics, ms: number): void {
    g.setAlpha(0.5);
    this.scene.tweens.add({ targets: g, alpha: 1, duration: 100, yoyo: true, repeat: -1 });
    this.scene.time.delayedCall(ms, () => g.destroy());
  }
}
