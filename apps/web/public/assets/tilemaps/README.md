# Room templates (Tiled)

One JSON file per room in `rooms/`, exported from [Tiled](https://www.mapeditor.org/). After editing, run `vp run @dh/web#rooms` to validate and regenerate `src/game/content/roomCatalog.json` (CI fails if it is stale).

## Conventions

- Map: 15×11 tiles of 16 px, orthogonal. **Embed tilesets** on export (no `.tsx` references).
- Tileset `tiles-s1.png` (firstgid 1): `1` floor, `2` floor alt, `3` wall (`collides: true`), `4` crate (decor), `5` floor decor, `6` corrupted prop. Ids `7`–`26` (wall face, floor variants, wall shadow, wall caps) are placed at build time by `autotile`; don't paint them in Tiled. The tilesets are drawn by `scripts/gen-art.ts`.
- Map properties (string): `roomType` = `start | combat | chest | vendor | log | boss`; `sectors` = e.g. `1` or `1,2`; `doors` = the doors the room can open, e.g. `N,E,S,W`.
- Tile layers: `floor`, `walls` (every non-empty tile collides), `decor`.
- Object layer `spawns`: point objects whose type (class) is `guardian | crate | chest | vendor | log | player-start | lift | boss`.
- Doors are 3 tiles wide and centred: N/S at columns 6–8, E/W at rows 4–6. Leave declared door openings free of walls; the rest of the outer ring must be wall. Unused openings are sealed when the sector is built.
- Combat rooms need at least 6 `guardian` spawns. Start needs `player-start`; chest, vendor, log and boss rooms need their matching spawn.

The current Sector 1 rooms are generated placeholders; reshape them freely in Tiled.
