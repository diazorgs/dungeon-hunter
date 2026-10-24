import { UI_FONT } from "../hud/text.ts";
import Phaser from "phaser";

const POOL = 64;

/** Optional floating numbers (off by default). shortcut: canvas Text until plan 23 adds the bitmap font. */
export class DamageNumbers {
  private readonly pool: Phaser.GameObjects.Text[] = [];
  private readonly scene: Phaser.Scene;
  private readonly enabled: boolean;

  constructor(scene: Phaser.Scene, enabled: boolean) {
    this.scene = scene;
    this.enabled = enabled;
    if (!enabled) return;
    for (let i = 0; i < POOL; i++)
      this.pool.push(
        scene.add
          .text(0, 0, "", { fontFamily: UI_FONT, fontSize: "8px", color: "#eef2f7" })
          .setOrigin(0.5)
          .setResolution(4)
          .setDepth(6500)
          .setVisible(false),
      );
  }

  show(x: number, y: number, n: number): void {
    if (!this.enabled) return;
    const t = this.pool.find((p) => !p.visible);
    if (!t) return;
    t.setText(String(n))
      .setPosition(x, y - 8)
      .setAlpha(1)
      .setVisible(true);
    this.scene.tweens.add({
      targets: t,
      y: y - 20,
      alpha: 0,
      duration: 400,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => t.setVisible(false),
    });
  }
}
