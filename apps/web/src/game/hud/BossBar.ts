import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import { hudText } from "./text.ts";

const W = 160;

/** Top-centre bar, visible only during a boss fight. */
export class BossBar {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly name: Phaser.GameObjects.Text;
  private readonly x: number;
  private readonly y = 6;
  private maxHp = 1;
  private markers: number[] = [];

  constructor(scene: Phaser.Scene) {
    this.x = (scene.scale.width - W) / 2;
    this.g = scene.add.graphics().setVisible(false);
    this.name = hudText(scene, scene.scale.width / 2, this.y + 7, "#ffb3e6")
      .setOrigin(0.5, 0)
      .setVisible(false);
  }

  show(name: string, maxHp: number, phaseMarkers: number[] = []): void {
    this.maxHp = maxHp;
    this.markers = phaseMarkers;
    this.name.setText(name.toUpperCase()).setVisible(true);
    this.g.setVisible(true);
    this.update(maxHp);
  }

  update(hp: number): void {
    const g = this.g.clear();
    g.fillStyle(PALETTE.ink).fillRect(this.x - 1, this.y - 1, W + 2, 6);
    g.fillStyle(PALETTE["bleed-500"]).fillRect(
      this.x,
      this.y,
      Math.round((W * Math.max(0, hp)) / this.maxHp),
      4,
    );
    g.fillStyle(PALETTE.bone);
    for (const m of this.markers) g.fillRect(this.x + Math.round(W * m), this.y - 1, 1, 6);
  }

  hide(): void {
    this.g.setVisible(false);
    this.name.setVisible(false);
  }
}
