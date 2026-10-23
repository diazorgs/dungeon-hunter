import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./env.ts";

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.use("*", (c, next) => cors({ origin: c.env.WEB_ORIGIN, credentials: true })(c, next));

const routes = app.get("/health", (c) => c.json({ ok: true }));

export type AppType = typeof routes;
export default app;
