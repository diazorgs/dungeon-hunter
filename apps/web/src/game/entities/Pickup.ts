import Phaser from "phaser";

export type PickupKind = "energy" | "scrap" | "health";

export const PICKUP_TEXTURE: Record<PickupKind, string> = {
  energy: "ph-orb",
  scrap: "ph-scrap",
  health: "ph-health",
};

/** Pooled floor pickup (see PickupSystem). */
export class Pickup extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  kind: PickupKind = "scrap";
  amount = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "ph-scrap");
  }
}
