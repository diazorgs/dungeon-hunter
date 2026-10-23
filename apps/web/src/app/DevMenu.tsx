import { DEFAULT_SETTINGS } from "@dh/shared";
import { generateSeed } from "@dh/utils";
import { parseDevParams } from "../game/logic/devParams.ts";
import { useSessionStore } from "../stores/session.ts";

/** Dev-only start screen until the real screens land in plan 22. */
export function DevMenu() {
  const startRun = useSessionStore((s) => s.startRun);
  const start = () =>
    startRun({
      runnerId: "vex",
      seed: parseDevParams(location.search).seed ?? generateSeed(),
      unlockedWeaponIds: [],
      unlockedModIds: [],
      collectedLogIds: [],
      settings: DEFAULT_SETTINGS,
      firstRun: false,
    });
  return (
    <main className="grid min-h-screen place-items-center bg-[#0b0d12] font-mono text-[#cfd8e6]">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl">DUNGEON HUNTER · dev</h1>
        <p className="text-[#8296b8]">Runner: Vex (Breacher)</p>
        <button
          type="button"
          autoFocus
          onClick={start}
          className="border-2 border-[#34415a] bg-[#141821] px-6 py-2 hover:border-[#e08a2e] focus-visible:outline-2 focus-visible:outline-[#eef2f7]"
        >
          Start run
        </button>
      </div>
    </main>
  );
}
