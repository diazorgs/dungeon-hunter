import { DEFAULT_SETTINGS } from "@dh/shared";
import type { Settings } from "@dh/shared";
import { create } from "zustand";

interface SettingsState {
  settings: Settings;
  update: (patch: Partial<Omit<Settings, "version">>) => void;
  replace: (s: Settings) => void;
}

/** Persisted by `ProfileRepositoryProvider` through the active repository. */
export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  replace: (settings) => set({ settings }),
}));
