import { expect, test } from "vite-plus/test";
import { parseDevParams } from "./devParams.ts";

test("invalid values are dropped", () =>
  expect(parseDevParams("?scene=sandbox&sector=4&seed=bad")).toEqual({ scene: "sandbox" }));
test("spawn list and god flag", () =>
  expect(parseDevParams("?spawn=crawler,sentry-drone&god=1")).toEqual({
    spawn: ["crawler", "sentry-drone"],
    god: true,
  }));
test("valid seed and sector kept", () =>
  expect(parseDevParams("?seed=ABCD1234&sector=2")).toEqual({ seed: "ABCD1234", sector: 2 }));
test("runner override accepts known runners only", () => {
  expect(parseDevParams("?runner=kit")).toEqual({ runner: "kit" });
  expect(parseDevParams("?runner=nope")).toEqual({});
});
