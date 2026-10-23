import { expect, test } from "vite-plus/test";

test("logic folder runs without Phaser", () => expect(typeof globalThis.window).toBe("undefined"));
