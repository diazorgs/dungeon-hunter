import { createApp } from "../index.ts";
import { createMemoryRepo } from "../db/memoryRepo.ts";

export const env = {
  SUPABASE_URL: "",
  SUPABASE_SECRET_KEY: "",
  WEB_ORIGIN: "http://localhost:5173",
};

/** A memory-backed app plus a tiny cookie jar, so tests read like a browser session. */
export function setup(opts: { accessTtlSec?: number } = {}) {
  const repo = createMemoryRepo(opts);
  const app = createApp(() => repo);
  const jar = new Map<string, string>();
  const send = async (method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await app.request(
      path,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
      env,
    );
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, v] = pair!.split("=");
      if (/Max-Age=0/.test(c) || v === "") jar.delete(k!);
      else jar.set(k!, v!);
    }
    return res;
  };
  return {
    repo,
    jar,
    get: (p: string) => send("GET", p),
    post: (p: string, b?: unknown) => send("POST", p, b),
    put: (p: string, b?: unknown) => send("PUT", p, b),
    register: (username = "runner_47", email = `${username}@b.co`) =>
      send("POST", "/api/auth/register", { email, password: "hunter22", username }),
  };
}
