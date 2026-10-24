import Phaser from "phaser";

export interface DroneOpts {
  durationMs: number;
  fireRate: number;
  damage: number;
  range: number;
  bulletSpeed: number;
}

/** Kit's Patch Drone turret. Visual only; PatchDrone decides when it fires and expires. */
export class Drone extends Phaser.GameObjects.Sprite {
  readonly opts: DroneOpts;
  readonly expiresAt: number;
  nextShotAt = 0;
  aim = 0;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: DroneOpts) {
    super(scene, x, y, "ph-drone");
    this.opts = opts;
    this.baseY = y;
    this.expiresAt = scene.time.now + opts.durationMs;
    scene.add.existing(this);
    this.setDepth(y + 1000);
  }

  update(now: number): void {
    // Hover bob: 1 px either way on a 600 ms period.
    this.y = this.baseY + Math.round(Math.sin(now / 95));
  }

  expire(): void {
    if (!this.active) return;
    const pop = this.scene.add.image(this.x, this.y, "ph-spark").setScale(4).setDepth(6000);
    this.scene.tweens.add({
      targets: pop,
      alpha: 0,
      scale: 0,
      duration: 200,
      onComplete: () => pop.destroy(),
    });
    this.destroy();
  }
}
