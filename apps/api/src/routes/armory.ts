import { ArmoryItemRefSchema, findArmoryItem } from "@dh/shared";
import { Hono } from "hono";
import { sessionMiddleware } from "../auth/session.ts";
import type { AppEnv } from "../env.ts";
import { apiError } from "../errors.ts";
import { validate } from "./validate.ts";

export const armoryRoutes = new Hono<AppEnv>()
  .use(sessionMiddleware)
  .post("/purchase", validate("json", ArmoryItemRefSchema), async (c) => {
    const ref = c.req.valid("json");
    // Price comes from armory.json, never from the request.
    const item = findArmoryItem(ref);
    if (!item) return apiError(c, 404, "UNKNOWN_ITEM");
    const r = await c.var.repo.purchase(c.var.userId, ref, item.cost);
    if ("error" in r) return apiError(c, 409, r.error);
    return c.json(await c.var.repo.getMe(c.var.userId), 200);
  });
