/// <reference types="node" />
import { readFileSync } from "node:fs";
import { BOSS_IDS, GUARDIAN_IDS, RUNNER_IDS, WEAPON_IDS } from "@dh/shared";
import { expect, test } from "vite-plus/test";
import { ATLASES } from "./manifest.ts";
import { textureFor } from "./textures.ts";

const framesOf = (key: string): string[] => {
  const atlas = ATLASES.find((a) => a.key === key)!;
  const json = readFileSync(new URL(`../../../public/${atlas.url}.json`, import.meta.url), "utf8");
  return (JSON.parse(json) as { frames: { filename: string }[] }).frames.map((f) => f.filename);
};

test.each([
  ...RUNNER_IDS.map((id) => ["runner", id] as const),
  ...BOSS_IDS.map((id) => ["boss", id] as const),
  ...GUARDIAN_IDS.map((id) => ["guardian", id] as const),
  ...WEAPON_IDS.map((id) => ["weapon", id] as const),
])("%s %s has an atlas frame", (kind, id) => {
  const tex = textureFor(kind, id);
  expect(framesOf(tex.key)).toContain(tex.frame);
});
test("every runner has the five animations", () => {
  const frames = framesOf("runners");
  for (const id of RUNNER_IDS)
    for (const anim of ["idle", "run", "dash", "hurt", "death"])
      expect(frames).toContain(`${id}/${anim}/0`);
});
