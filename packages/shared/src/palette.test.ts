import { expect, test } from "vite-plus/test";
import { PALETTE, toCss } from "./palette.ts";

test("32 tokens", () => expect(Object.keys(PALETTE)).toHaveLength(32));
test("toCss pads and lowercases", () => {
  expect(toCss(PALETTE.void)).toBe("#0b0d12");
  expect(toCss(PALETTE["bleed-500"])).toBe("#d81b8c");
});
