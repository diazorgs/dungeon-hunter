import type Phaser from "phaser";

/** Generated atlases (scripts/gen-art.ts). Frames are named `<id>/<anim>/<i>`. */
export const ATLASES = [
  { key: "runners", url: "assets/sprites/runners", animPrefix: "runner" },
  { key: "bosses", url: "assets/sprites/bosses", animPrefix: "boss" },
] as const;

export function queueAtlases(load: Phaser.Loader.LoaderPlugin): void {
  for (const a of ATLASES) load.atlas(a.key, `${a.url}.png`, `${a.url}.json`);
}
