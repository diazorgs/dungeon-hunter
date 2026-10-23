import type { RunnerId } from "@dh/shared";
import { create } from "zustand";
import type { RunConfig, RunSummary } from "../game/bridge/types.ts";

type Screen = "dev-menu" | "run" | "results";

interface SessionState {
  screen: Screen;
  selectedRunnerId: RunnerId;
  runConfig: RunConfig | null;
  lastRunSummary: RunSummary | null;
  startRun: (config: RunConfig) => void;
  endRun: (summary: RunSummary) => void;
  goTo: (screen: Exclude<Screen, "run">) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  screen: "dev-menu",
  selectedRunnerId: "vex",
  runConfig: null,
  lastRunSummary: null,
  startRun: (runConfig) => set({ screen: "run", runConfig, selectedRunnerId: runConfig.runnerId }),
  endRun: (lastRunSummary) => set({ screen: "results", lastRunSummary, runConfig: null }),
  goTo: (screen) => set({ screen }),
}));
