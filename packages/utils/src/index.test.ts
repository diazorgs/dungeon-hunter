import { expect, test } from "vite-plus/test";
import { VERSION } from "./index.ts";

test("VERSION", () => expect(VERSION).toBe("0.0.1"));
