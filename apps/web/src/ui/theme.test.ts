/// <reference types="node" />
import { readFileSync } from "node:fs";
import { PALETTE, toCss } from "@dh/shared";
import { expect, test } from "vite-plus/test";

test("every palette token is a Tailwind colour with the same value", () => {
  // Read from disk: Vitest strips CSS imports.
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  for (const [token, value] of Object.entries(PALETTE))
    expect(css).toContain(`--color-${token}: ${toCss(value)};`);
});
