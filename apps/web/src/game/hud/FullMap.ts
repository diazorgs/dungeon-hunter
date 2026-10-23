import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import type { MinimapCell } from "../logic/minimap.ts";
import { drawCells } from "./Minimap.ts";
import { hudText } from "./text.ts";

/** Tab overlay: the minimap at 6× with a legend. */
export class FullMap {
  private readonly container: Phaser.GameObjects.Container;
  private readonly g: Phaser.GameObjects.Graphics;
  private cells: readonly MinimapCell[] = [];

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.g = scene.add.graphics();
    const legend = hudText(scene, width / 2 - 150, height / 2 + 86, "#8296b8").setText(
      "you  visited  seen   ■ chest  ■ vendor  ■ boss  ■ log     Tab close",
    );
    this.container = scene.add.container(0, 0, [
      scene.add.rectangle(0, 0, width, height, PALETTE.ink, 0.5).setOrigin(0),
      this.g,
      legend,
    ]);
    this.container.setDepth(100).setVisible(false);
  }

  get open(): boolean {
    return this.container.visible;
  }

  toggle(): void {
    this.container.setVisible(!this.container.visible);
    this.render(this.cells);
  }

  close(): void {
    this.container.setVisible(false);
  }

  render(cells: readonly MinimapCell[]): void {
    this.cells = cells;
    if (!this.open) return;
    const g = this.g.clear();
    g.fillStyle(PALETTE.ink).fillRect(80, 35, 320, 200);
    g.lineStyle(1, PALETTE["steel-700"]).strokeRect(80.5, 35.5, 319, 199);
    // 5 × (48 + 2) = 250 by 5 × (30 + 2) = 160, centred in the panel.
    drawCells(g, cells, 115, 50, 48, 30);
  }
}
