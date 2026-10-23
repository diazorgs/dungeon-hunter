import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import { hudText } from "./text.ts";

const R = 8;

/** Cooldown ring that fills clockwise; flashes bone when the skill becomes ready. */
export class SkillRing {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly y: number;
  private key = "";
  private wasReady = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.g = scene.add.graphics();
    this.label = hudText(scene, x + R + 4, y - 4, "#a9b8d1");
  }

  update(progress: number, remainingSec: number): void {
    const ready = progress >= 1;
    const key = ready ? "ready" : `${Math.round(progress * 40)}/${Math.ceil(remainingSec)}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.g.clear();
    g.lineStyle(2, PALETTE["steel-700"]).strokeCircle(this.x, this.y, R);
    g.lineStyle(2, ready ? PALETTE["amber-300"] : PALETTE["amber-500"]);
    g.beginPath()
      .arc(this.x, this.y, R, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
      .strokePath();
    this.label.setText(ready ? "SKILL" : `${Math.ceil(remainingSec)}s`);
    if (ready && !this.wasReady) {
      const flash = this.scene.add.circle(this.x, this.y, R + 2, PALETTE.bone);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 250,
        onComplete: () => flash.destroy(),
      });
    }
    this.wasReady = ready;
  }
}
