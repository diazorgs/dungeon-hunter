import type { RunnerId } from "@dh/shared";
import { create } from "zustand";
import type { RunConfig, RunSummary } from "../game/bridge/types.ts";

export type Screen =
  | "title"
  | "intro"
  | "auth"
  | "staging"
  | "armory"
  | "logs"
  | "leaderboard"
  | "settings"
  | "run"
  | "results"
  | "ending";

interface SessionState {
  screen: Screen;
  /** Where Settings / Auth return to. */
  backTo: Screen;
  selectedRunnerId: RunnerId;
  runConfig: RunConfig | null;
  lastRunSummary: RunSummary | null;
  authMode: "guest" | "account";
  startRun: (config: RunConfig) => void;
  endRun: (summary: RunSummary) => void;
  goTo: (screen: Exclude<Screen, "run">, backTo?: Screen) => void;
  selectRunner: (id: RunnerId) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  screen: "title",
  backTo: "title",
  selectedRunnerId: "vex",
  runConfig: null,
  lastRunSummary: null,
  authMode: "guest",
  startRun: (runConfig) => set({ screen: "run", runConfig, selectedRunnerId: runConfig.runnerId }),
  endRun: (lastRunSummary) => set({ screen: "results", lastRunSummary, runConfig: null }),
  goTo: (screen, backTo) => set((s) => ({ screen, backTo: backTo ?? s.backTo })),
  selectRunner: (selectedRunnerId) => set({ selectedRunnerId }),
}));
