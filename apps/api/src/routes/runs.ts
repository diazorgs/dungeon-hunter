import { computeShardPayout, RunResultSchema, validateRun } from "@dh/shared";
import { Hono } from "hono";
import { sessionMiddleware } from "../auth/session.ts";
import type { AppEnv } from "../env.ts";
import { apiError } from "../errors.ts";
import { validate } from "./validate.ts";

/** The client reports what happened; the server decides the shards. Rejected runs are not stored. */
export const runRoutes = new Hono<AppEnv>()
  .use(sessionMiddleware)
  .post("/", validate("json", RunResultSchema), async (c) => {
    const run = c.req.valid("json");
    const check = validateRun(run);
    if (!check.ok) return apiError(c, 422, `RUN_REJECTED:${check.reason}`);
    const repo = c.var.repo;
    const before = await repo.getMe(c.var.userId);
    const newLogIds = run.logsFound.filter((id) => !before.vaultLogs.includes(id));
    const shardsAwarded = computeShardPayout(run);
    const r = await repo.awardRun(c.var.userId, run, shardsAwarded, newLogIds);
    if ("error" in r) return apiError(c, 429, r.error, "One run per minute");
    return c.json({ shardsAwarded, newLogIds, me: await repo.getMe(c.var.userId) }, 200);
  });
