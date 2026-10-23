import { createRng, generateSeed } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { generateSector } from "../dungeon/generate.ts";
import { estimateSectorMinutes } from "./pacing.ts";

test("sector 1 estimate across 200 seeds", () => {
  const r = createRng("pacing");
  const minutes = Array.from({ length: 200 }, () =>
    estimateSectorMinutes(
      generateSector(
        generateSeed(() => r.next()),
        1,
      ),
      1,
    ),
  ).sort((a, b) => a - b);
  const median = minutes[100]!;
  console.info(`sector 1 estimate: min ${minutes[0]} median ${median} max ${minutes.at(-1)}`);
  // PRD target is ~8 min. 4-combat layouts estimate 6.8 min; the band below is checked against playtests (docs/playtests/m3-slice.md).
  expect(median).toBeGreaterThanOrEqual(7);
  expect(median).toBeLessThanOrEqual(11);
  expect(minutes.at(-1)!).toBeLessThanOrEqual(11);
});
