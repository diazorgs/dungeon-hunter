import { expect, test } from "vite-plus/test";
import { VERSION } from "./index.ts";

test("shared re-exports utils VERSION", () => expect(VERSION).toBe("0.0.1"));
