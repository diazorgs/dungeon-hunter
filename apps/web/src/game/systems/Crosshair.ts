import type Phaser from "phaser";
import type { Vec2 } from "../logic/input.ts";

/** Drawn in Phaser because the canvas hides the OS cursor. With a pad it marks the aim point. */
export class Crosshair {
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.image = scene.add.image(0, 0, "ph-crosshair").setDepth(7000);
  }

  update(pointerWorld: Vec2, device: "kbm" | "pad", aimPoint: Vec2): void {
    const p = device === "pad" ? aimPoint : pointerWorld;
    this.image.setPosition(Math.round(p.x), Math.round(p.y));
  }
}
