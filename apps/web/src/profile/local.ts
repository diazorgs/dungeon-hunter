import { checkPurchase, computeShardPayout, validateRun } from "@dh/shared";
import type { ArmoryItemRef, RunResult, Settings } from "@dh/shared";
import { migrateLocalProfile, migrateSettings } from "./migrate.ts";
import { ProfileError } from "./types.ts";
import type { Profile, ProfileRepository, RunReward } from "./types.ts";

export const PROFILE_KEY = "dh.profile.v1";
export const SETTINGS_KEY = "dh.settings.v1";

type KV = Pick<Storage, "getItem" | "setItem">;

/** localStorage, or null when the browser blocks it (progress then lasts for the session). */
export function safeLocalStorage(): Storage | null {
  try {
    localStorage.setItem("dh.probe", "1");
    localStorage.removeItem("dh.probe");
    return localStorage;
  } catch {
    return null;
  }
}

/** Fallback when storage is blocked, and for tests. */
export function memoryStorage(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function readJson(storage: KV, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Guest progress in localStorage, paid out with the same shared rules as the server. */
export class LocalProfileRepository implements ProfileRepository {
  private readonly storage: KV;

  constructor(storage: KV | null) {
    this.storage = storage ?? memoryStorage();
  }

  async load(): Promise<Profile> {
    return this.read();
  }

  async loadSettings(): Promise<Settings> {
    return migrateSettings(readJson(this.storage, SETTINGS_KEY));
  }

  async submitRun(run: RunResult): Promise<RunReward> {
    // Re-read before every write so another tab's purchase is never overwritten.
    const p = this.read();
    p.stats.totalRuns++;
    const check = validateRun(run);
    if (!check.ok)
      return { shardsAwarded: 0, newLogIds: [], rejected: check.reason, profile: this.write(p) };
    const shardsAwarded = computeShardPayout(run);
    const newLogIds = run.logsFound.filter((id) => !p.vaultLogs.includes(id));
    p.coreShards += shardsAwarded;
    p.vaultLogs.push(...newLogIds);
    if (run.victory) {
      p.stats.totalVictories++;
      const best = p.stats.bestVictorySec;
      if (best === null || run.durationSec < best) p.stats.bestVictorySec = run.durationSec;
    }
    return { shardsAwarded, newLogIds, profile: this.write(p) };
  }

  async purchase(ref: ArmoryItemRef): Promise<Profile> {
    const p = this.read();
    const check = checkPurchase(p, ref);
    if (!check.ok) throw new ProfileError(check.code);
    p.coreShards -= check.cost;
    p.unlocks.push({ itemType: ref.itemType, itemId: ref.itemId });
    return this.write(p);
  }

  async saveSettings(s: Settings): Promise<void> {
    this.set(SETTINGS_KEY, s);
  }

  async markSeen(flag: "intro" | "ending"): Promise<Profile> {
    const p = this.read();
    if (flag === "intro") p.seenIntro = true;
    else p.seenEnding = true;
    return this.write(p);
  }

  private read(): Profile {
    return migrateLocalProfile(readJson(this.storage, PROFILE_KEY));
  }

  private write(p: Profile): Profile {
    this.set(PROFILE_KEY, p);
    return p;
  }

  private set(key: string, value: unknown): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota or blocked storage: the in-memory copy returned to the caller still holds the change.
    }
  }
}
