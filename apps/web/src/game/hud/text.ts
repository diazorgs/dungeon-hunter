import type Phaser from "phaser";

// shortcut: canvas Text until plan 23 adds the BitmapText pixel font (DESIGN.md §11.3).
export function hudText(scene: Phaser.Scene, x: number, y: number, color: string, size = 8) {
  return scene.add
    .text(x, y, "", { fontFamily: "monospace", fontSize: `${size}px`, color })
    .setResolution(4);
}
