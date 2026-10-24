import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { bus } from "../game/bridge/bus.ts";
import { useSettingsStore } from "../stores/settings.ts";
import { PROFILE, RepoContext } from "./context.ts";
import { PROFILE_KEY } from "./local.ts";
import type { ProfileRepository } from "./types.ts";

/** Supplies the active repository and keeps settings + profile in sync with it. */
export function ProfileRepositoryProvider({
  repo,
  children,
}: {
  repo: ProfileRepository;
  children: ReactNode;
}) {
  const qc = useQueryClient();
  useEffect(() => {
    let loaded = false;
    void repo.loadSettings().then((s) => {
      useSettingsStore.getState().replace(s);
      loaded = true;
    });
    const unsub = useSettingsStore.subscribe((s, prev) => {
      if (loaded && s.settings !== prev.settings) void repo.saveSettings(s.settings);
    });
    const offBus = bus.on("settings:changed", (s) => useSettingsStore.getState().replace(s));
    // Another tab wrote progress: refetch instead of overwriting it with our stale copy.
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_KEY) void qc.invalidateQueries({ queryKey: PROFILE });
    };
    addEventListener("storage", onStorage);
    void qc.invalidateQueries({ queryKey: PROFILE });
    return () => {
      unsub();
      offBus();
      removeEventListener("storage", onStorage);
    };
  }, [repo, qc]);
  return <RepoContext value={repo}>{children}</RepoContext>;
}
