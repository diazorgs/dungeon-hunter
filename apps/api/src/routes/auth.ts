import { LoginSchema, RegisterSchema } from "@dh/shared";
import { Hono } from "hono";
import { clearSessionCookies, readSessionCookies, setSessionCookies } from "../auth/cookies.ts";
import type { AppEnv } from "../env.ts";
import { apiError } from "../errors.ts";
import { validate } from "./validate.ts";

export const authRoutes = new Hono<AppEnv>()
  .post("/register", validate("json", RegisterSchema), async (c) => {
    const { email, password, username } = c.req.valid("json");
    const repo = c.var.repo;
    const user = await repo.createUser(email, password);
    if ("error" in user) return apiError(c, 409, "EMAIL_TAKEN");
    const profile = await repo.createProfile(user.userId, username);
    if ("error" in profile) {
      // No orphan auth user for a taken username.
      await repo.deleteUser(user.userId);
      return apiError(c, 409, "USERNAME_TAKEN");
    }
    const session = await repo.signIn(email, password);
    if (!session) throw new Error("sign-in failed right after register");
    setSessionCookies(c, session);
    return c.json(await repo.getMe(user.userId), 200);
  })
  .post("/login", validate("json", LoginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const session = await c.var.repo.signIn(email, password);
    // Same answer for unknown email and wrong password.
    if (!session) return apiError(c, 401, "INVALID_CREDENTIALS");
    setSessionCookies(c, session);
    return c.json(await c.var.repo.getMe(session.userId), 200);
  })
  .post("/logout", async (c) => {
    const { access } = readSessionCookies(c);
    // Best effort: an already-expired token has nothing left to revoke.
    if (access) await c.var.repo.signOut(access).catch(() => undefined);
    clearSessionCookies(c);
    return c.body(null, 204);
  });
