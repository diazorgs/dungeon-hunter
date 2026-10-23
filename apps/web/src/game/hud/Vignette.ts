import type Phaser from "phaser";

/** Full-screen colour pulse (damage feedback). */
export class Vignette {
  private readonly rect: Phaser.GameObjects.Rectangle;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.rect = scene.add
      .rectangle(0, 0, scene.scale.width, scene.scale.height, 0, 0)
      .setOrigin(0)
      .setDepth(50);
  }

  pulse(colour: number, ms: number): void {
    this.rect.setFillStyle(colour, 0.35);
    this.scene.tweens.killTweensOf(this.rect);
    this.scene.tweens.add({ targets: this.rect, fillAlpha: 0, duration: ms });
  }
}
