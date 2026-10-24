import { createApiClient } from "../lib/api.ts";
import { ApiProfileRepository } from "../profile/api.ts";
import { LocalProfileRepository, safeLocalStorage } from "../profile/local.ts";

/** One instance of each backend for the page's lifetime; the session store picks which is active. */
export const storage = safeLocalStorage();
export const api = createApiClient();
export const localRepo = new LocalProfileRepository(storage);
export const accountRepo = new ApiProfileRepository(api, localRepo);

/** App start: a valid session cookie means account mode. API down or no session → guest. */
export async function detectAuthMode(): Promise<"guest" | "account"> {
  try {
    const res = await api.api.me.$get({}, { init: { signal: AbortSignal.timeout(3000) } });
    return res.ok ? "account" : "guest";
  } catch {
    return "guest";
  }
}
