import type { ArmoryItemRef, MeResponse, RunResult, Settings } from "@dh/shared";
import { errorCode } from "../lib/api.ts";
import type { ApiClient } from "../lib/api.ts";
import { clearPendingRun, savePendingRun, takePendingRun } from "./pendingRun.ts";
import { ProfileError } from "./types.ts";
import type { Profile, ProfileRepository, RunReward } from "./types.ts";

/** Account progress via the API. `seenIntro`/`seenEnding` stay per device in the local repo. */
export class ApiProfileRepository implements ProfileRepository {
  private readonly api: ApiClient;
  private readonly local: ProfileRepository;
  private lastMe: MeResponse | null = null;

  constructor(api: ApiClient, local: ProfileRepository) {
    this.api = api;
    this.local = local;
  }

  async load(): Promise<Profile> {
    return this.toProfile(await this.me());
  }

  async loadSettings(): Promise<Settings> {
    return (this.lastMe ?? (await this.me())).settings;
  }

  async submitRun(run: RunResult): Promise<RunReward> {
    savePendingRun(run);
    const res = await this.api.api.runs.$post({ json: run });
    if (res.status !== 200) {
      const code = await errorCode(res);
      // A definitive answer clears it; a lost session or network error keeps it for a retry.
      if (code.startsWith("RUN_REJECTED") || code === "RATE_LIMITED") clearPendingRun();
      throw new ProfileError(code);
    }
    clearPendingRun();
    const reward = await res.json();
    this.lastMe = reward.me;
    return {
      shardsAwarded: reward.shardsAwarded,
      newLogIds: reward.newLogIds,
      profile: await this.toProfile(reward.me),
    };
  }

  /** After a login: resubmits a run that finished while the session was gone, once. */
  async replayPendingRun(): Promise<RunReward | null> {
    const run = takePendingRun();
    return run ? this.submitRun(run).catch(() => null) : null;
  }

  async purchase(ref: ArmoryItemRef): Promise<Profile> {
    const res = await this.api.api.armory.purchase.$post({ json: ref });
    if (res.status !== 200) throw new ProfileError(await errorCode(res));
    return this.toProfile((this.lastMe = await res.json()));
  }

  async saveSettings(s: Settings): Promise<void> {
    const res = await this.api.api.me.settings.$put({ json: s });
    if (!res.ok) throw new ProfileError(await errorCode(res));
  }

  async markSeen(flag: "intro" | "ending"): Promise<Profile> {
    await this.local.markSeen(flag);
    return this.load();
  }

  private async me(): Promise<MeResponse> {
    const res = await this.api.api.me.$get();
    if (res.status !== 200) throw new ProfileError(await errorCode(res));
    return (this.lastMe = await res.json());
  }

  private async toProfile(me: MeResponse): Promise<Profile> {
    const local = await this.local.load();
    return {
      version: 1,
      username: me.profile.username,
      coreShards: me.profile.coreShards,
      unlocks: me.unlocks,
      vaultLogs: me.vaultLogs,
      stats: me.stats,
      seenIntro: local.seenIntro,
      seenEnding: local.seenEnding,
    };
  }
}
