import { findArmoryItem, GuestImportSchema, LOG_IDS, SettingsSchema } from "@dh/shared";
import type { LogId } from "@dh/shared";
import { Hono } from "hono";
import { sessionMiddleware } from "../auth/session.ts";
import type { AppEnv } from "../env.ts";
import { apiError } from "../errors.ts";
import { validate } from "./validate.ts";

const isLog = (id: string): id is LogId => (LOG_IDS as readonly string[]).includes(id);

export const meRoutes = new Hono<AppEnv>()
  .use(sessionMiddleware)
  .get("/", async (c) => c.json(await c.var.repo.getMe(c.var.userId), 200))
  .put("/settings", validate("json", SettingsSchema), async (c) => {
    await c.var.repo.saveSettings(c.var.userId, c.req.valid("json"));
    return c.body(null, 204);
  })
  // Once per account. Values are re-checked here: only real Armory items and Vault Logs count.
  .post("/import", validate("json", GuestImportSchema), async (c) => {
    const body = c.req.valid("json");
    const r = await c.var.repo.importGuest(c.var.userId, {
      coreShards: body.coreShards,
      unlocks: body.unlocks.filter((u) => findArmoryItem(u)),
      vaultLogs: body.vaultLogs.filter(isLog),
      stats: body.stats,
    });
    if ("error" in r) return apiError(c, 409, r.error);
    return c.json(await c.var.repo.getMe(c.var.userId), 200);
  });
