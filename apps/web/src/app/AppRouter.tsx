import { PhaserGame } from "../game/PhaserGame.tsx";
import { useSessionStore } from "../stores/session.ts";
import { DevMenu } from "./DevMenu.tsx";

export function AppRouter() {
  const { screen, runConfig, lastRunSummary, endRun, goTo } = useSessionStore();
  if (screen === "run" && runConfig) return <PhaserGame config={runConfig} onRunEnded={endRun} />;
  if (screen === "results")
    return (
      <main className="min-h-screen bg-[#0b0d12] p-8 font-mono text-[#cfd8e6]">
        <pre>{JSON.stringify(lastRunSummary, null, 2)}</pre>
        <button
          type="button"
          autoFocus
          onClick={() => goTo("dev-menu")}
          className="mt-4 border-2 border-[#34415a] px-4 py-1 hover:border-[#e08a2e]"
        >
          Back
        </button>
      </main>
    );
  return <DevMenu />;
}
