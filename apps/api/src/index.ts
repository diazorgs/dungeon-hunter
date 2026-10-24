import { Hono } from "hono";
import { cors } from "hono/cors";
import { sessionMiddleware } from "./auth/session.ts";
import type { Repo } from "./db/repo.ts";
import { createSupabaseRepo } from "./db/supabaseRepo.ts";
import type { AppEnv, Bindings } from "./env.ts";
import { apiError } from "./errors.ts";
import { armoryRoutes } from "./routes/armory.ts";
import { authRoutes } from "./routes/auth.ts";
import { leaderboardRoutes } from "./routes/leaderboard.ts";
import { meRoutes } from "./routes/me.ts";
import { runRoutes } from "./routes/runs.ts";

/** Routes depend only on `Repo`, so tests inject the memory repo (no Docker, no network). */
export function createApp(makeRepo: (env: Bindings) => Repo) {
  const app = new Hono<AppEnv>().basePath("/api");
  app.use("*", (c, next) => cors({ origin: c.env.WEB_ORIGIN, credentials: true })(c, next));
  app.use("*", async (c, next) => {
    c.set("repo", makeRepo(c.env));
    await next();
  });
  app.onError((err, c) => {
    console.error(err);
    return apiError(c, 500, "INTERNAL", "Something went wrong");
  });
  const routes = app
    .get("/health", (c) => c.json({ ok: true }))
    .route("/auth", authRoutes)
    .route("/me", meRoutes)
    .route("/runs", runRoutes)
    .route("/armory", armoryRoutes)
    .route("/leaderboard", leaderboardRoutes)
    .get("/session-check", sessionMiddleware, (c) => c.json({ userId: c.var.userId }));
  return routes;
}

const app = createApp(createSupabaseRepo);
export type AppType = typeof app;
export default app;
