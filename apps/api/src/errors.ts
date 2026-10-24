import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** DESIGN.md §9.3 error body. */
// Generic over the status so the Hono RPC client keeps each route's literal error statuses.
export const apiError = <S extends ContentfulStatusCode>(
  c: Context,
  status: S,
  code: string,
  message = code,
) => c.json({ error: { code, message } }, status);
