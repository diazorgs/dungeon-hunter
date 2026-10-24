import { ARMORY, RUNNER_IDS, RUNNERS, availableRunners } from "@dh/shared";
import { useStartRun } from "../../app/useStartRun.ts";
import { useProfile } from "../../profile/queries.ts";
import { useSessionStore } from "../../stores/session.ts";
import { Menu } from "../components/Menu.tsx";
import { Panel } from "../components/Panel.tsx";
import { PixelButton } from "../components/PixelButton.tsx";
import { ShardCount } from "../components/ShardCount.tsx";
import { TelemetryPanel } from "../components/TelemetryPanel.tsx";

const SKILL_TEXT = {
  overcharge: "Overcharge: double fire rate, no energy cost.",
  "patch-drone": "Patch Drone: a turret that auto-fires at enemies.",
} as const;

export function StagingBayScreen() {
  const { goTo, selectRunner } = useSessionStore();
  const selected = useSessionStore((s) => s.selectedRunnerId);
  const start = useStartRun();
  const { data: profile } = useProfile();
  if (!profile) return null;
  const owned = availableRunners(profile.unlocks);
  const runnerId = owned.includes(selected) ? selected : "vex";
  return (
    <div className="flex h-full flex-col gap-8 p-16">
      <header className="flex items-baseline justify-between">
        <h1 className="text-[32px] text-steel-200">STAGING BAY</h1>
        <ShardCount shards={profile.coreShards} />
      </header>
      <div className="grid flex-1 grid-cols-[1fr_256px] gap-8">
        <Panel title="Choose a Runner">
          <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Runner">
            {RUNNER_IDS.map((id) => {
              const r = RUNNERS[id];
              const locked = !owned.includes(id);
              const price = ARMORY.find((a) => a.itemType === "runner" && a.itemId === id)?.cost;
              return (
                <PixelButton
                  key={id}
                  role="radio"
                  aria-checked={runnerId === id}
                  disabled={locked}
                  onClick={() => selectRunner(id)}
                  className="h-full normal-case"
                >
                  <span className="block text-2xl uppercase">
                    {r.name} <span className="text-base text-steel-400">{r.title}</span>
                  </span>
                  <span className="mt-2 block text-base text-steel-300">
                    HP {r.hp} · Shield {r.shield} · Energy {r.energy}
                  </span>
                  <span className="mt-2 block text-base text-steel-400">
                    {SKILL_TEXT[r.skill.id]} {r.skill.durationSec}s, cooldown {r.skill.cooldownSec}
                    s.
                  </span>
                  {locked ? (
                    <span className="mt-2 block text-base text-scrap">
                      Locked: unlock in the Armory for {price} Core Shards
                    </span>
                  ) : null}
                </PixelButton>
              );
            })}
          </div>
          <p className="mt-8 text-base text-steel-400">
            Goal: reach the Core at the bottom of the Vault and shut it down. Every run earns Core
            Shards, even when your Runner falls.
          </p>
        </Panel>
        <Menu
          items={[
            { label: "Start run", action: start },
            { label: "Armory", action: () => goTo("armory") },
            { label: "Vault Logs", action: () => goTo("logs") },
            { label: "Leaderboard", action: () => goTo("leaderboard") },
            { label: "Settings", action: () => goTo("settings", "staging") },
            { label: "Title", action: () => goTo("title") },
          ]}
          onBack={() => goTo("title")}
        />
      </div>
      {import.meta.env.DEV ? <TelemetryPanel /> : null}
    </div>
  );
}
