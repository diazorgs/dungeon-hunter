import type Phaser from "phaser";
import { hudText } from "./text.ts";

export class ScrapCounter {
  private readonly text: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private value = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.text = hudText(scene, x, y, "#ffd23f");
  }

  update(n: number): void {
    if (n === this.value) return;
    if (n > this.value && this.value >= 0)
      this.scene.tweens.add({ targets: this.text, scale: 1.25, duration: 60, yoyo: true });
    this.value = n;
    this.text.setText(`SCRAP ${n}`);
  }
}
