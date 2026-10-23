import type { Player } from "../entities/Player.ts";
import { assistAngle } from "../logic/combat/aim.ts";
import type { AimTarget } from "../logic/combat/aim.ts";
import type { Vec2 } from "../logic/input.ts";
import { lineClear } from "../logic/los.ts";

/** Gathers aim targets, applies line of sight against walls, and asks the pure logic for the angle. */
export class AimAssist {
  private targets: () => readonly AimTarget[] = () => [];
  private blocked: (x: number, y: number) => boolean = () => false;

  /** Registered by the guardian system; returns live enemies only. */
  setTargetsProvider(fn: () => readonly AimTarget[]): void {
    this.targets = fn;
  }

  setBlocked(fn: (x: number, y: number) => boolean): void {
    this.blocked = fn;
  }

  update(player: Player, cursor: Vec2, mode: "soft" | "full"): number {
    const visible = this.targets().map((t) => ({
      ...t,
      visible: t.visible && this.canSee(player, t),
    }));
    return assistAngle(player, cursor, visible, mode, player.aimAngle);
  }

  private canSee(from: Vec2, to: Vec2): boolean {
    return lineClear(this.blocked, from, to);
  }
}
