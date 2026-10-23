import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import type { MinimapCell, MinimapIcon } from "../logic/minimap.ts";

const ICON_COLOR: Record<MinimapIcon, number> = {
  chest: PALETTE.scrap,
  vendor: PALETTE["teal-200"],
  boss: PALETTE["bleed-500"],
  log: PALETTE.energy,
};
const STATE_COLOR = {
  current: PALETTE["amber-500"],
  visited: PALETTE["steel-400"],
  known: PALETTE["steel-700"],
};

/** Draws minimap cells; used at 8×6 for the corner map and larger for the Tab overlay. */
export function drawCells(
  g: Phaser.GameObjects.Graphics,
  cells: readonly MinimapCell[],
  ox: number,
  oy: number,
  cw: number,
  ch: number,
): void {
  const at = (c: { gx: number; gy: number }) => ({
    x: ox + c.gx * (cw + 2),
    y: oy + c.gy * (ch + 2),
  });
  for (const c of cells) {
    const p = at(c);
    g.fillStyle(STATE_COLOR[c.state]).fillRect(p.x, p.y, cw, ch);
    // Door stubs toward neighbours.
    g.fillStyle(PALETTE["steel-600"]);
    for (const d of c.doors) {
      if (d === "E") g.fillRect(p.x + cw, p.y + ch / 2 - 1, 2, 2);
      if (d === "S") g.fillRect(p.x + cw / 2 - 1, p.y + ch, 2, 2);
    }
    if (c.icon) {
      const s = Math.max(2, Math.floor(Math.min(cw, ch) / 3));
      g.fillStyle(ICON_COLOR[c.icon]).fillRect(p.x + cw / 2 - s / 2, p.y + ch / 2 - s / 2, s, s);
    }
  }
}

/** 64×48 corner minimap, redrawn only when told to. */
export class Minimap {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private readonly y: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.g = scene.add.graphics();
  }

  render(cells: readonly MinimapCell[]): void {
    const g = this.g.clear();
    g.fillStyle(PALETTE.ink, 0.8).fillRect(this.x, this.y, 64, 48);
    g.lineStyle(1, PALETTE["steel-700"]).strokeRect(this.x + 0.5, this.y + 0.5, 63, 47);
    // 5×5 grid of 8×6 cells with 2 px gaps = 48×38, centred.
    drawCells(g, cells, this.x + 8, this.y + 5, 8, 6);
  }
}
