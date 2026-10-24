import { parseDevParams } from "../game/logic/devParams.ts";
import { useProfile } from "../profile/queries.ts";
import { buildRunConfig } from "../profile/runConfig.ts";
import { useSessionStore } from "../stores/session.ts";
import { useSettingsStore } from "../stores/settings.ts";

/** Starts a run for the selected Runner from the current profile (`?seed=` / `?runner=` in DEV). */
export function useStartRun(): () => void {
  const { data: profile } = useProfile();
  const startRun = useSessionStore((s) => s.startRun);
  const runnerId = useSessionStore((s) => s.selectedRunnerId);
  const settings = useSettingsStore((s) => s.settings);
  return () => {
    if (!profile) return;
    if (!import.meta.env.DEV) return startRun(buildRunConfig(profile, runnerId, settings));
    // DEV: ?seed= and ?runner= (the latter ignores unlocks, for testing Kit).
    const dev = parseDevParams(location.search);
    const config = buildRunConfig(profile, runnerId, settings, dev.seed);
    startRun(dev.runner ? { ...config, runnerId: dev.runner } : config);
  };
}
