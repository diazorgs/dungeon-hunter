import type Phaser from "phaser";
import { WALL_TOP_DEPTH } from "../content/rooms.ts";
import { Door } from "../entities/Door.ts";
import { autotile } from "../logic/dungeon/autotile.ts";
import { TILE_PX } from "../logic/dungeon/compose.ts";
import type { ComposedSector } from "../logic/dungeon/compose.ts";

export interface BuiltSector {
  map: Phaser.Tilemaps.Tilemap;
  wallLayer: Phaser.Tilemaps.TilemapLayer;
  doors: Door[];
  doorGroup: Phaser.Physics.Arcade.StaticGroup;
}

const LOCKABLE = new Set(["combat", "boss"]);

/**
 * Renders a composed sector in 3/4 view: floor, decor and wall faces under the actors, wall caps
 * over them, and an invisible full-wall layer for collision. Plus doors.
 */
export function buildSector(
  scene: Phaser.Scene,
  c: ComposedSector,
  tilesetKey: string,
): BuiltSector {
  const map = scene.make.tilemap({
    tileWidth: TILE_PX,
    tileHeight: TILE_PX,
    width: c.widthTiles,
    height: c.heightTiles,
  });
  const tileset = map.addTilesetImage(tilesetKey, tilesetKey, TILE_PX, TILE_PX, 0, 0, 1)!;
  const rows = (data: Int32Array) =>
    Array.from({ length: c.heightTiles }, (_, y) =>
      Array.from(data.subarray(y * c.widthTiles, (y + 1) * c.widthTiles), (v) =>
        v === 0 ? -1 : v,
      ),
    );
  const layer = (name: string, data: Int32Array, depth: number) => {
    const l = map.createBlankLayer(name, tileset)!;
    l.putTilesAt(rows(data), 0, 0).setDepth(depth);
    return l;
  };
  const view = autotile(c.floor, c.walls, c.widthTiles);
  layer("floor", view.floor, 0);
  layer("decor", c.decor, 10);
  layer("faces", view.faces, 10);
  layer("caps", view.caps, WALL_TOP_DEPTH);
  const wallLayer = layer("walls", c.walls, 0).setVisible(false);
  wallLayer.setCollisionByExclusion([-1]);

  const doorGroup = scene.physics.add.staticGroup();
  const doors = c.doors
    .filter((d) => LOCKABLE.has(c.rooms.find((r) => r.id === d.roomId)!.type))
    .map((d) => {
      const r = d.tileRect;
      const door = new Door(
        scene,
        (r.x + r.w / 2) * TILE_PX,
        (r.y + r.h / 2) * TILE_PX,
        d.roomId,
        d.dir,
      );
      doorGroup.add(door);
      door.unlock();
      return door;
    });
  return { map, wallLayer, doors, doorGroup };
}
