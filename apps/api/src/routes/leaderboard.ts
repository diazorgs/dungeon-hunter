import { LeaderboardQuerySchema } from "@dh/shared";
import type { RunnerId } from "@dh/shared";
import { Hono } from "hono";
import type { AppEnv } from "../env.ts";
import { validate } from "./validate.ts";

const LIMIT = 50;

/** Public. Usernames are the only personal data returned. */
export const leaderboardRoutes = new Hono<AppEnv>().get(
  "/",
  validate("query", LeaderboardQuerySchema),
  async (c) => {
    const rows = await c.var.repo.leaderboard({ ...c.req.valid("query"), limit: LIMIT });
    return c.json(
      { entries: rows.map((r, i) => ({ rank: i + 1, ...r, runnerId: r.runnerId as RunnerId })) },
      200,
    );
  },
);
