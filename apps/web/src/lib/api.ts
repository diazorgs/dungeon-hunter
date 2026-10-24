import type { AppType } from "@dh/api";
import { hc } from "hono/client";

export type ApiClient = ReturnType<typeof hc<AppType>>;

/** Hono RPC client. Same origin (Vite proxy in dev, `/api/*` route in prod), cookies included. */
export const createApiClient = (fetchImpl: typeof fetch = fetch): ApiClient =>
  hc<AppType>(new URL(import.meta.env.VITE_API_URL ?? "/", location.origin).href, {
    fetch: fetchImpl,
    init: { credentials: "include" },
  });

/** Error body code (DESIGN.md §9.3), or a status-based fallback. */
export async function errorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { code?: string } };
    if (body.error?.code) return body.error.code;
  } catch {
    // not JSON
  }
  return `HTTP_${res.status}`;
}
