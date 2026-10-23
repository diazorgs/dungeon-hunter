import { degToRad, rotateToward } from "@dh/utils";
import Phaser from "phaser";
import type { Bullet } from "../../entities/Bullet.ts";
import type { Guardian } from "../../entities/Guardian.ts";
import { blockedByShield } from "../../logic/ai/shield.ts";
import { seek } from "../../logic/ai/steer.ts";
import type { AiController, AiWorld } from "./AiController.ts";

const HOLD_DIST = 56;
const SHIELD_OFFSET = 10;

/** Shield Bot: advances behind a frontal shield that turns slowly. Teaches "flank or use bouncing shots". */
export class ShieldAi implements AiController {
  private facing: number;
  private lastShot = 0;
  private readonly g: Guardian;
  private readonly w: AiWorld;
  private readonly shield: Phaser.GameObjects.Image;

  constructor(g: Guardian, w: AiWorld) {
    this.g = g;
    this.w = w;
    this.facing = Math.atan2(w.player.y - g.y, w.player.x - g.x);
    this.shield = w.scene.add.image(g.x, g.y, "ph-shield");
    g.once(Phaser.GameObjects.Events.DESTROY, () => this.shield.destroy());
  }

  blocks(b: Bullet): boolean {
    const arc = this.g.def.attack.shieldArcDeg ?? 100;
    return blockedByShield(this.facing, Math.atan2(b.body.velocity.y, b.body.velocity.x), arc);
  }

  update(now: number, dt: number): void {
    const { g, w } = this;
    const a = g.def.attack;
    const toPlayer = Math.atan2(w.player.y - g.y, w.player.x - g.x);
    this.facing = rotateToward(this.facing, toPlayer, degToRad(a.turnDegPerSec ?? 90) * dt);
    const far = Math.hypot(w.player.x - g.x, w.player.y - g.y) > HOLD_DIST;
    const v = far ? seek(g, w.player, g.def.speed) : { x: 0, y: 0 };
    g.setVelocity(v.x, v.y);
    this.shield
      .setPosition(
        g.x + Math.cos(this.facing) * SHIELD_OFFSET,
        g.y + Math.sin(this.facing) * SHIELD_OFFSET,
      )
      .setRotation(this.facing)
      .setDepth(g.depth + 1)
      .setVisible(g.visible);
    if (now - this.lastShot >= (a.fireEveryMs ?? 2000) && w.canSee(g, w.player)) {
      this.lastShot = now;
      g.fire(w.enemyBullets, this.facing, a.boltSpeed ?? 90);
    }
  }
}
