import Phaser from "phaser";
import type { LogId } from "@dh/shared";

/** Vault Log terminal in a log room; E opens a non-pausing panel on the HUD. */
export class LogTerminal extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  readonly logId: LogId;

  constructor(scene: Phaser.Scene, x: number, y: number, logId: LogId) {
    super(scene, x, y, "ph-log-terminal");
    this.logId = logId;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(y + 1000);
  }
}
