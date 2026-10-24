import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** DESIGN.md §9.3 error body. */
export const apiError = (c: Context, status: ContentfulStatusCode, code: string, message = code) =>
  c.json({ error: { code, message } }, status);
