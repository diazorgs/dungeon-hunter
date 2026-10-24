import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env.ts";
import { apiError } from "../errors.ts";
import { clearSessionCookies, readSessionCookies, setSessionCookies } from "./cookies.ts";

/** Sets `c.var.userId` from the access cookie, refreshing it when expired. Never trusts a body. */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const repo = c.var.repo;
  const { access, refresh } = readSessionCookies(c);
  const verified = access ? await repo.verifyAccessToken(access) : null;
  if (verified) {
    c.set("userId", verified.userId);
    return next();
  }
  const session = refresh ? await repo.refresh(refresh) : null;
  if (!session) {
    clearSessionCookies(c);
    return apiError(c, 401, "UNAUTHORIZED");
  }
  setSessionCookies(c, session);
  c.set("userId", session.userId);
  return next();
});
