import type Phaser from "phaser";
import { Door } from "../entities/Door.ts";
import { TILE_PX } from "../logic/dungeon/compose.ts";
import type { ComposedSector } from "../logic/dungeon/compose.ts";

export interface BuiltSector {
  map: Phaser.Tilemaps.Tilemap;
  wallLayer: Phaser.Tilemaps.TilemapLayer;
  doors: Door[];
  doorGroup: Phaser.Physics.Arcade.StaticGroup;
}

const LOCKABLE = new Set(["combat", "boss"]);

/** Renders a composed sector: one blank tilemap with floor, walls and decor layers, plus doors. */
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
  layer("floor", c.floor, 0);
  layer("decor", c.decor, 10);
  const wallLayer = layer("walls", c.walls, 10);
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
