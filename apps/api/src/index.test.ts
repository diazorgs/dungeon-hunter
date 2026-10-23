import { expect, test } from "vite-plus/test";
import app from "./index.ts";

const env = { SUPABASE_URL: "", SUPABASE_SECRET_KEY: "", WEB_ORIGIN: "http://localhost:5173" };

test("GET /api/health returns ok", async () => {
  const res = await app.request("/api/health", {}, env);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("CORS allows only WEB_ORIGIN with credentials", async () => {
  const res = await app.request("/api/health", { headers: { Origin: "http://evil.test" } }, env);
  expect(res.headers.get("access-control-allow-origin")).not.toBe("http://evil.test");
  const ok = await app.request("/api/health", { headers: { Origin: env.WEB_ORIGIN } }, env);
  expect(ok.headers.get("access-control-allow-origin")).toBe(env.WEB_ORIGIN);
  expect(ok.headers.get("access-control-allow-credentials")).toBe("true");
});
