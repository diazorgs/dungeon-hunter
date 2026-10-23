import Phaser from "phaser";
import type { Player } from "../entities/Player.ts";
import { assistAngle } from "../logic/combat/aim.ts";
import type { AimTarget } from "../logic/combat/aim.ts";
import type { Vec2 } from "../logic/input.ts";

/** Gathers aim targets, applies line of sight against walls, and asks the pure logic for the angle. */
export class AimAssist {
  private targets: () => readonly AimTarget[] = () => [];
  private walls: readonly Phaser.Geom.Rectangle[] = [];
  private readonly sight = new Phaser.Geom.Line();

  /** Registered by the guardian system (plan 07); returns live enemies only. */
  setTargetsProvider(fn: () => readonly AimTarget[]): void {
    this.targets = fn;
  }

  setWalls(walls: Phaser.Physics.Arcade.StaticGroup): void {
    this.walls = (walls.getChildren() as Phaser.Physics.Arcade.Image[]).map((w) => w.getBounds());
  }

  update(player: Player, cursor: Vec2, mode: "soft" | "full"): number {
    const visible = this.targets().map((t) => ({
      ...t,
      visible: t.visible && this.canSee(player, t),
    }));
    return assistAngle(player, cursor, visible, mode, player.aimAngle);
  }

  private canSee(from: Vec2, to: Vec2): boolean {
    this.sight.setTo(from.x, from.y, to.x, to.y);
    return !this.walls.some((r) => Phaser.Geom.Intersects.LineToRectangle(this.sight, r));
  }
}
