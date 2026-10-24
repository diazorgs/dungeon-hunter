import { expect, test } from "vite-plus/test";
import { setup } from "../test/helpers.ts";

test("register sets both httpOnly cookies", async () => {
  const { register } = setup();
  const res = await register();
  expect(res.status).toBe(200);
  const set = res.headers.getSetCookie().join(";");
  expect(set).toMatch(/dh_at=[^;]+;.*HttpOnly/);
  expect(set).toMatch(/dh_rt=[^;]+;.*HttpOnly/);
  expect(set).toMatch(/SameSite=Lax/);
  expect(set).toMatch(/Secure/);
  expect(set).toMatch(/Path=\/api/);
});

test("duplicate username → 409 USERNAME_TAKEN and no orphan auth user", async () => {
  const a = setup();
  await a.register("runner_47", "a@b.co");
  const before = a.repo._users.size;
  const res = await a.register("runner_47", "other@b.co");
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({
    error: { code: "USERNAME_TAKEN", message: "USERNAME_TAKEN" },
  });
  expect(a.repo._users.size).toBe(before);
});

test("duplicate email → 409 EMAIL_TAKEN", async () => {
  const a = setup();
  await a.register("one", "a@b.co");
  expect((await a.register("two", "a@b.co")).status).toBe(409);
});

test("wrong password and unknown email give identical errors", async () => {
  const a = setup();
  await a.register("runner_47", "a@b.co");
  const wrong = await a.post("/api/auth/login", { email: "a@b.co", password: "nope-nope" });
  const unknown = await a.post("/api/auth/login", { email: "z@b.co", password: "hunter22" });
  expect(wrong.status).toBe(401);
  expect(unknown.status).toBe(401);
  expect(await wrong.json()).toEqual(await unknown.json());
});

test("email is trimmed and lowercased", async () => {
  const a = setup();
  await a.register("runner_47", " A@B.co ");
  const res = await a.post("/api/auth/login", { email: "a@b.co", password: "hunter22" });
  expect(res.status).toBe(200);
});

test("bad body → 400 VALIDATION", async () => {
  const res = await setup().post("/api/auth/register", {
    email: "nope",
    password: "x",
    username: "A!",
  });
  expect(res.status).toBe(400);
  expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDATION");
});

test("expired access + valid refresh → 200 and rotated cookies", async () => {
  const a = setup({ accessTtlSec: 60 });
  await a.register();
  const oldAccess = a.jar.get("dh_at");
  a.repo.clock.now += 120_000;
  const res = await a.get("/api/session-check");
  expect(res.status).toBe(200);
  expect(a.jar.get("dh_at")).not.toBe(oldAccess);
});

test("invalid refresh clears cookies and returns 401", async () => {
  const a = setup({ accessTtlSec: 60 });
  await a.register();
  a.repo.clock.now += 120_000;
  a.jar.set("dh_rt", "forged");
  const res = await a.get("/api/session-check");
  expect(res.status).toBe(401);
  expect(a.jar.size).toBe(0);
});

test("no cookies → 401 UNAUTHORIZED", async () => {
  const res = await setup().get("/api/session-check");
  expect(res.status).toBe(401);
  expect(((await res.json()) as { error: { code: string } }).error.code).toBe("UNAUTHORIZED");
});

test("logout clears cookies (Max-Age=0)", async () => {
  const a = setup();
  await a.register();
  const res = await a.post("/api/auth/logout");
  expect(res.status).toBe(204);
  expect(res.headers.getSetCookie().join(";")).toMatch(/dh_at=;.*Max-Age=0/);
  expect(a.jar.size).toBe(0);
});

test("body userId is ignored", async () => {
  const a = setup();
  const reg = (await (await a.register()).json()) as { profile: { id: string } };
  const res = await a.post("/api/session-check", { userId: "someone-else" });
  // POST is not routed; GET with the cookie returns the cookie's user.
  expect(res.status).toBe(404);
  const ok = (await (await a.get("/api/session-check")).json()) as { userId: string };
  expect(ok.userId).toBe(reg.profile.id);
});
