// Validates every Tiled room in public/assets/tilemaps/rooms and writes the metadata catalog.
// Run: vp run @dh/web#rooms
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { parseTiledRoom, toMeta, validateTemplate } from "../src/game/logic/dungeon/tiled.ts";

const dir = new URL("../public/assets/tilemaps/rooms/", import.meta.url);
const errors: string[] = [];
const metas = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const t = parseTiledRoom(
      JSON.parse(readFileSync(new URL(f, dir), "utf8")),
      f.replace(".json", ""),
    );
    errors.push(...validateTemplate(t).map((e) => `${t.id}: ${e}`));
    return toMeta(t);
  })
  .sort((a, b) => a.id.localeCompare(b.id));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
writeFileSync(
  new URL("../src/game/content/roomCatalog.json", import.meta.url),
  JSON.stringify(metas, null, 2) + "\n",
);
console.log(`roomCatalog.json: ${metas.length} templates`);
