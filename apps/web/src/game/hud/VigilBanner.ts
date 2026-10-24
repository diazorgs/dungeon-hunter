import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import { hudText } from "./text.ts";

/** VIGIL's top-centre warning: bleed-300 on ink with a scanline flicker. Runs on HUD time. */
export class VigilBanner {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private until = 0;

  constructor(scene: Phaser.Scene) {
    const x = scene.scale.width / 2;
    this.bg = scene.add.rectangle(x, 34, 180, 14, PALETTE.ink, 0.9).setVisible(false);
    this.text = hudText(scene, x, 34, "#ff4fbf").setOrigin(0.5).setVisible(false);
  }

  show(text: string, ms: number, now: number): void {
    this.until = now + ms;
    this.text.setText(text);
    this.bg.setSize(text.length * 6 + 16, 14);
    this.bg.setVisible(true);
    this.text.setVisible(true);
  }

  update(now: number): void {
    const on = now < this.until;
    // Flicker: every few frames the banner dims, like a bad scanline.
    const alpha = on && Math.floor(now / 50) % 7 === 0 ? 0.4 : 1;
    this.bg.setVisible(on).setAlpha(alpha);
    this.text.setVisible(on).setAlpha(alpha);
  }
}
