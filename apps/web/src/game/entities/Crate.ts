import Phaser from "phaser";

const CRATE_HP = 3;

/** Destructible cover; breaking it is LootSystem's business (`crate:broken`). */
export class Crate extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  hp = CRATE_HP;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "ph-crate");
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(y + 1000);
  }

  /** Returns true when this hit broke it. */
  hit(dmg: number): boolean {
    if (!this.active) return false;
    this.hp -= dmg;
    if (this.hp > 0) return false;
    this.scene.events.emit("crate:broken", { x: this.x, y: this.y });
    // Disable now, destroy next tick: never remove a body inside a collision callback.
    this.disableBody(true, true);
    this.scene.time.delayedCall(0, () => this.destroy());
    return true;
  }
}
