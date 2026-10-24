import type Phaser from "phaser";

/** The game's one UI font (DESIGN.md §11.3), loaded by PreloadScene. */
export const UI_FONT = "Silkscreen, monospace";

// shortcut: canvas Text at 4× resolution with the pixel font instead of BitmapText; crisp at
// 8/16 px. Switch to a generated BitmapText font if text ever shows blur at odd zoom levels.
export function hudText(scene: Phaser.Scene, x: number, y: number, color: string, size = 8) {
  return scene.add
    .text(x, y, "", { fontFamily: UI_FONT, fontSize: `${size}px`, color })
    .setResolution(4);
}
