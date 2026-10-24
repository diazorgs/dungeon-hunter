import { LOGS } from "@dh/shared";
import { useState } from "react";
import type { RunSummary } from "../../game/bridge/types.ts";
import type { RunReward } from "../../profile/types.ts";
import { useSessionStore } from "../../stores/session.ts";
import { Panel } from "../components/Panel.tsx";
import { Menu } from "../components/Menu.tsx";

const SECTOR_NAMES = { 1: "Storage Wing", 2: "Conduit Works", 3: "Core Approach" } as const;
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function ResultsScreen({
  summary,
  reward,
  pending,
  error,
  onRunAgain,
}: {
  summary: RunSummary;
  reward: RunReward | undefined;
  pending: boolean;
  error: string | null;
  onRunAgain: () => void;
}) {
  const goTo = useSessionStore((s) => s.goTo);
  const [copied, setCopied] = useState(false);
  const r = summary.result;
  const victory = summary.outcome === "victory";
  const firstVictory = victory && reward?.profile.seenEnding === false;
  const newLogs = reward?.newLogIds ?? summary.newLogIds;
  const copySeed = () =>
    void navigator.clipboard?.writeText(r.seed).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  const stats: [string, string][] = [
    ["Sector reached", `${r.sectorReached} · ${SECTOR_NAMES[r.sectorReached]}`],
    ["Rooms cleared", String(r.roomsCleared)],
    ["Bosses", String(r.bossesKilled)],
    ["Kills", String(r.kills)],
    ["Time", mmss(r.durationSec)],
    ["Scrap earned", String(summary.scrapEarned)],
  ];
  return (
    <div className="flex h-full flex-col gap-8 p-16">
      <h1 className={`text-[32px] ${victory ? "text-heal" : "text-bleed-300"}`}>
        {victory ? "CORE SHUTDOWN CONFIRMED" : "Runner signal lost. Deploying next unit."}
      </h1>
      <div className="grid flex-1 grid-cols-[1fr_1fr_256px] gap-8 text-base">
        <Panel title="Run">
          <dl className="grid grid-cols-2 gap-y-2">
            {stats.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-steel-400">{k}</dt>
                <dd className="text-steel-200">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Rewards">
          <p className="text-2xl text-scrap" role="status">
            {pending
              ? "Counting Core Shards…"
              : error
                ? "Shards not saved"
                : `+${reward?.shardsAwarded ?? 0} ◆ Core Shards`}
          </p>
          {reward?.rejected ? (
            <p className="mt-2 text-hp">This run failed validation ({reward.rejected}).</p>
          ) : null}
          {error ? <p className="mt-2 text-hp">{error}</p> : null}
          <button
            type="button"
            onClick={copySeed}
            className="mt-4 block text-steel-400 hover:text-steel-200 focus-visible:outline-2 focus-visible:outline-bone"
          >
            Seed {r.seed} {copied ? "(copied)" : "(click to copy)"}
          </button>
          {newLogs.length ? (
            <div className="mt-4">
              <p className="text-teal-200">New Vault Logs</p>
              <ul>
                {newLogs.map((id) => (
                  <li key={id}>{LOGS[id].title}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
        <Menu
          items={[
            ...(firstVictory ? [{ label: "Continue", action: () => goTo("ending") }] : []),
            { label: "Staging Bay", action: () => goTo("staging") },
            { label: "Run again", action: onRunAgain, disabled: pending },
          ]}
        />
      </div>
    </div>
  );
}
