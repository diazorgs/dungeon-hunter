import { parseDevParams } from "../game/logic/devParams.ts";
import { useProfile } from "../profile/queries.ts";
import { buildRunConfig } from "../profile/runConfig.ts";
import { useSessionStore } from "../stores/session.ts";
import { useSettingsStore } from "../stores/settings.ts";

/** Starts a run for the selected Runner from the current profile (`?seed=` in DEV). */
export function useStartRun(): () => void {
  const { data: profile } = useProfile();
  const startRun = useSessionStore((s) => s.startRun);
  const runnerId = useSessionStore((s) => s.selectedRunnerId);
  const settings = useSettingsStore((s) => s.settings);
  return () => {
    if (!profile) return;
    const seed = import.meta.env.DEV ? parseDevParams(location.search).seed : undefined;
    startRun(buildRunConfig(profile, runnerId, settings, seed));
  };
}
