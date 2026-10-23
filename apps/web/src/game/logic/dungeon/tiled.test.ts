import { expect, test } from "vite-plus/test";
import catalog from "../../content/roomCatalog.json" with { type: "json" };
import { doorTiles, parseTiledRoom, toMeta, validateTemplate } from "./tiled.ts";
import type { Dir } from "./types.ts";

// Minimal fixture: a 15×11 ring with all four door openings.
function fixture(
  opts: { roomType?: string; guardians?: number; blockN?: boolean; source?: boolean } = {},
) {
  const walls = Array<number>(165).fill(0);
  for (let y = 0; y < 11; y++)
    for (let x = 0; x < 15; x++)
      if (x === 0 || y === 0 || x === 14 || y === 10) walls[y * 15 + x] = 3;
  for (const d of ["N", "E", "S", "W"] as Dir[])
    for (const [x, y] of doorTiles(d)) walls[y * 15 + x] = 0;
  if (opts.blockN) walls[7] = 3;
  const tile = (name: string, data: number[]) => ({ name, type: "tilelayer", data });
  return {
    width: 15,
    height: 11,
    properties: [
      { name: "roomType", value: opts.roomType ?? "combat" },
      { name: "sectors", value: "1" },
      { name: "doors", value: "N,E,S,W" },
    ],
    tilesets: [opts.source ? { source: "tiles.tsx" } : { name: "tiles" }],
    layers: [
      tile("floor", Array(165).fill(1)),
      tile("walls", walls),
      tile("decor", Array(165).fill(0)),
      {
        name: "spawns",
        type: "objectgroup",
        objects: Array.from({ length: opts.guardians ?? 6 }, (_, i) => ({
          type: "guardian",
          x: 40 + i * 16,
          y: 40,
        })),
      },
    ],
  };
}

test("valid combat room passes", () =>
  expect(validateTemplate(parseTiledRoom(fixture(), "c"))).toEqual([]));
test("blocked north door is named", () =>
  expect(validateTemplate(parseTiledRoom(fixture({ blockN: true }), "c")).join()).toMatch(
    /door N/,
  ));
test("combat room with 5 guardian spawns fails", () =>
  expect(validateTemplate(parseTiledRoom(fixture({ guardians: 5 }), "c")).join()).toMatch(
    /guardian/,
  ));
test("external tileset asks to embed", () =>
  expect(() => parseTiledRoom(fixture({ source: true }), "c")).toThrow(/embed tilesets/));

// Every committed template must validate, and the generated catalog must be current.
const files = import.meta.glob<unknown>("/public/assets/tilemaps/rooms/*.json", {
  eager: true,
  import: "default",
});
const committed = Object.entries(files).map(([path, json]) =>
  parseTiledRoom(json, path.split("/").pop()!.replace(".json", "")),
);
test("there are committed templates", () => expect(committed.length).toBeGreaterThan(0));
test.each(committed.map((t) => [t.id, t] as const))("committed template %s is valid", (_id, t) =>
  expect(validateTemplate(t)).toEqual([]),
);
test("roomCatalog.json is up to date (run `vp run @dh/web#rooms`)", () =>
  expect(catalog).toEqual(committed.map(toMeta).sort((a, b) => a.id.localeCompare(b.id))));
