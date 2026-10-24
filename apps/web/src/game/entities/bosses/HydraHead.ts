import Phaser from "phaser";
import { createEnemyHealth } from "../../logic/combat/enemyHealth.ts";
import type { EnemyHealth } from "../../logic/combat/enemyHealth.ts";
import type { HeadId } from "../../logic/boss/hydra.ts";

/** One cable head of the Conduit Hydra: its own HP, its own attack. Disabled (not destroyed) when it dies. */
export class HydraHead extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly headId: HeadId;
  readonly health: EnemyHealth;

  constructor(scene: Phaser.Scene, x: number, y: number, headId: HeadId, hp: number) {
    super(scene, x, y, "bosses", "hydra-head/idle/0");
    if (!scene.textures.exists("bosses")) this.setTexture("ph-hydra-head");
    this.headId = headId;
    this.health = createEnemyHealth(hp);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.pushable = false;
  }
}
