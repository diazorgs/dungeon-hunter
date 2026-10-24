import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { z } from "zod";
import { apiError } from "../errors.ts";

/** zValidator with the DESIGN.md §9.3 error body (400 VALIDATION). Unknown keys are stripped by Zod. */
export const validate = <T extends keyof ValidationTargets, S extends z.ZodType>(
  target: T,
  schema: S,
) =>
  zValidator(target, schema, (r, c) => {
    if (!r.success)
      return apiError(c, 400, "VALIDATION", r.error.issues[0]?.message ?? "Invalid request");
  });
