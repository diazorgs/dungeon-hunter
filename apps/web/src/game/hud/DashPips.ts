import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";

/** One pip per dash charge; filled when ready. */
export class DashPips {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private readonly y: number;
  private key = "";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.g = scene.add.graphics();
  }

  update(ready: number, max: number): void {
    const key = `${ready}/${max}`;
    if (key === this.key) return;
    this.key = key;
    this.g.clear();
    for (let i = 0; i < max; i++)
      this.g
        .fillStyle(i < ready ? PALETTE.shield : PALETTE["steel-700"])
        .fillRect(this.x + i * 5, this.y, 4, 2);
  }
}
