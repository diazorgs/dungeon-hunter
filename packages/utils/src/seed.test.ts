import { expect, test } from "vite-plus/test";
import { generateSeed, isValidSeed, SEED_REGEX } from "./seed.ts";

test("generateSeed matches SEED_REGEX", () => {
  for (let i = 0; i < 100; i++) expect(generateSeed()).toMatch(SEED_REGEX);
});
test("ambiguous Crockford letters are invalid", () => expect(isValidSeed("ILOU0000")).toBe(false));
test("valid seed accepted", () => expect(isValidSeed("ABCD1234")).toBe(true));
