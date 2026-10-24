import { expect, test } from "vite-plus/test";
import { hydraBarMarkers, hydraSteps } from "./hydra.ts";
import type { HeadId } from "./hydra.ts";

const all = new Set<HeadId>(["aimer", "spreader", "sweeper"]);

test("three heads, three steps", () => expect(hydraSteps(all, false)).toHaveLength(3));
test("dead sweeper means no beam sweep", () =>
  expect(hydraSteps(new Set<HeadId>(["aimer", "spreader"]), false).map((s) => s.id)).not.toContain(
    "beam-sweep",
  ));
test("last head attacks faster", () =>
  expect(hydraSteps(new Set<HeadId>(["aimer"]), false)[0]!.recoverMs).toBeCloseTo(900 * 0.8));
test("exposed core only uses core steps", () =>
  expect(hydraSteps(new Set(), true).map((s) => s.id)).toEqual(["core-pulse", "core-spiral"]));
test("bar markers", () =>
  expect(hydraBarMarkers({ heads: 150, core: 300 })).toEqual([0.8, 0.6, 0.4]));
