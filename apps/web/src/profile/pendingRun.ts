import type { RunResult } from "@dh/shared";

const KEY = "dh.pendingRun.v1";

/** A finished run survives an expired session: kept until the server accepts or rejects it. */
export function savePendingRun(r: RunResult): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    // Blocked storage: the run can only be retried while this page lives.
  }
}

export function takePendingRun(): RunResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as RunResult) : null;
  } catch {
    return null;
  }
}

export function clearPendingRun(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
