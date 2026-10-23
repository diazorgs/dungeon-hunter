import Phaser from "phaser";

export const TILE = 16;

/** A walled room of placeholder tiles centred in the view. `inner` is the walkable area. */
export function buildPlaceholderRoom(
  scene: Phaser.Scene,
  cols: number,
  rows: number,
): {
  walls: Phaser.Physics.Arcade.StaticGroup;
  inner: Phaser.Geom.Rectangle;
  blocked: (x: number, y: number) => boolean;
} {
  const { width, height } = scene.scale;
  const x0 = Math.round((width - cols * TILE) / 2);
  const y0 = Math.round((height - rows * TILE) / 2);
  scene.add
    .tileSprite(x0, y0, cols * TILE, rows * TILE, "ph-floor")
    .setOrigin(0)
    .setDepth(0);
  const walls = scene.physics.add.staticGroup();
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++)
      if (c === 0 || r === 0 || c === cols - 1 || r === rows - 1)
        walls.create(x0 + c * TILE + TILE / 2, y0 + r * TILE + TILE / 2, "ph-wall").setDepth(10);
  const inner = new Phaser.Geom.Rectangle(
    x0 + TILE,
    y0 + TILE,
    (cols - 2) * TILE,
    (rows - 2) * TILE,
  );
  const blocked = (x: number, y: number) =>
    (walls.getChildren() as Phaser.Physics.Arcade.Image[]).some((w) =>
      w.getBounds().contains(x, y),
    );
  return { walls, inner, blocked };
}
