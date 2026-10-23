import type { SectorId } from "@dh/shared";
import type { TemplateMeta } from "./templates.ts";
import type { Dir, RoomType } from "./types.ts";

export const ROOM_W = 15;
export const ROOM_H = 11;

export const SPAWN_KINDS = [
  "guardian",
  "crate",
  "chest",
  "vendor",
  "log",
  "player-start",
  "lift",
  "boss",
] as const;
export type SpawnKind = (typeof SPAWN_KINDS)[number];

export interface RoomTemplate extends TemplateMeta {
  width: typeof ROOM_W;
  height: typeof ROOM_H;
  floor: number[];
  walls: number[];
  decor: number[];
  /** Room-local pixel coordinates. */
  spawns: { kind: SpawnKind; x: number; y: number }[];
}

const ROOM_TYPES: readonly RoomType[] = ["start", "combat", "chest", "vendor", "log", "boss"];
const DIR_LIST: readonly Dir[] = ["N", "E", "S", "W"];

/** The 3 opening tiles of a door in the room's wall ring (DESIGN.md §7.3). */
export function doorTiles(dir: Dir): [number, number][] {
  const span = (c: number) => [c - 1, c, c + 1];
  if (dir === "N") return span(7).map((x) => [x, 0]);
  if (dir === "S") return span(7).map((x) => [x, ROOM_H - 1]);
  if (dir === "W") return span(5).map((y) => [0, y]);
  return span(5).map((y) => [ROOM_W - 1, y]);
}

interface TiledProp {
  name: string;
  value: unknown;
}
interface TiledLayer {
  name: string;
  type: string;
  data?: number[];
  objects?: TiledObject[];
}
interface TiledObject {
  type?: string;
  class?: string;
  x: number;
  y: number;
}
interface TiledMap {
  width: number;
  height: number;
  properties?: TiledProp[];
  tilesets?: { source?: string }[];
  layers?: TiledLayer[];
}

/** Reads one Tiled JSON room export. Throws with the template id on structural problems. */
export function parseTiledRoom(json: unknown, id: string): RoomTemplate {
  const fail = (msg: string): never => {
    throw new Error(`room ${id}: ${msg}`);
  };
  const map = json as TiledMap;
  if (!map || typeof map !== "object" || !Array.isArray(map.layers)) fail("not a Tiled map");
  if (map.tilesets?.some((t) => t.source)) fail("external tileset; embed tilesets on export");
  const prop = (name: string) => {
    const v = map.properties?.find((p) => p.name === name)?.value;
    return typeof v === "string" ? v : "";
  };
  const roomType = prop("roomType") as RoomType;
  if (!ROOM_TYPES.includes(roomType)) fail(`unknown roomType "${roomType}"`);
  const sectors = prop("sectors").split(",").map(Number) as SectorId[];
  if (sectors.some((s) => s !== 1 && s !== 2 && s !== 3)) fail(`bad sectors "${prop("sectors")}"`);
  const doors = prop("doors").split(",").filter(Boolean) as Dir[];
  if (doors.some((d) => !DIR_LIST.includes(d))) fail(`bad doors "${prop("doors")}"`);
  const tiles = (name: string) =>
    map.layers!.find((l) => l.name === name && l.type === "tilelayer")?.data ??
    fail(`missing tile layer "${name}"`);
  const objects =
    map.layers!.find((l) => l.name === "spawns" && l.type === "objectgroup")?.objects ?? [];
  const spawns = objects.map((o) => {
    // Tiled 1.9 exported the object class as `class`; other versions use `type`.
    const kind = (o.type || o.class) as SpawnKind;
    if (!SPAWN_KINDS.includes(kind)) fail(`unknown spawn kind "${kind}"`);
    return { kind, x: o.x, y: o.y };
  });
  return {
    id,
    roomType,
    sectors,
    doors,
    width: map.width as typeof ROOM_W,
    height: map.height as typeof ROOM_H,
    floor: tiles("floor"),
    walls: tiles("walls"),
    decor: tiles("decor"),
    spawns,
  };
}

const REQUIRED_SPAWN: Partial<Record<RoomType, SpawnKind>> = {
  start: "player-start",
  chest: "chest",
  vendor: "vendor",
  log: "log",
  boss: "boss",
};

/** Authoring rules; one message per problem, empty when valid. */
export function validateTemplate(t: RoomTemplate): string[] {
  const errors: string[] = [];
  if (t.width !== ROOM_W || t.height !== ROOM_H)
    errors.push(`size ${t.width}×${t.height}, expected 15×11`);
  for (const [name, data] of [
    ["floor", t.floor],
    ["walls", t.walls],
    ["decor", t.decor],
  ] as const)
    if (data.length !== ROOM_W * ROOM_H) errors.push(`layer ${name} has ${data.length} tiles`);
  const wall = (x: number, y: number) => (t.walls[y * ROOM_W + x] ?? 0) !== 0;

  const opening = new Set<string>();
  for (const d of t.doors)
    for (const [x, y] of doorTiles(d)) {
      opening.add(`${x},${y}`);
      if (wall(x, y)) errors.push(`door ${d} is blocked by a wall at (${x},${y})`);
    }
  for (let x = 0; x < ROOM_W; x++)
    for (let y = 0; y < ROOM_H; y++) {
      const ring = x === 0 || y === 0 || x === ROOM_W - 1 || y === ROOM_H - 1;
      if (ring && !opening.has(`${x},${y}`) && !wall(x, y))
        errors.push(`wall ring open at (${x},${y})`);
    }

  const count = (k: SpawnKind) => t.spawns.filter((s) => s.kind === k).length;
  if (t.roomType === "combat" && count("guardian") < 6)
    errors.push(`combat room needs ≥ 6 guardian spawns, has ${count("guardian")}`);
  const need = REQUIRED_SPAWN[t.roomType];
  if (need && count(need) === 0) errors.push(`${t.roomType} room needs a "${need}" spawn`);
  return errors;
}

export const toMeta = ({ id, roomType, sectors, doors }: RoomTemplate): TemplateMeta => ({
  id,
  roomType,
  sectors,
  doors,
});
