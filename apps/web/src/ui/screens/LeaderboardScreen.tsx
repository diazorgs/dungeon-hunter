import { useState } from "react";
import { useSessionStore } from "../../stores/session.ts";
import { useBackKey } from "../components/useBackKey.ts";
import { Panel } from "../components/Panel.tsx";
import { PixelButton } from "../components/PixelButton.tsx";
import { LeaderboardTable } from "./LeaderboardTable.tsx";

export type Period = "weekly" | "all";
export type Kind = "fastest" | "deepest";

export function LeaderboardScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const authMode = useSessionStore((s) => s.authMode);
  useBackKey(() => goTo("staging"));
  const [period, setPeriod] = useState<Period>("weekly");
  const [kind, setKind] = useState<Kind>("fastest");
  return (
    <div className="flex h-full flex-col gap-4 p-16">
      <h1 className="text-[32px] text-steel-200">LEADERBOARD</h1>
      {authMode === "guest" ? (
        <Panel title="Leaderboard requires an account">
          <p className="mb-4 text-base">Log in or register to post your runs and see the board.</p>
          <PixelButton autoFocus onClick={() => goTo("auth", "leaderboard")}>
            Log in
          </PixelButton>
        </Panel>
      ) : (
        <>
          <div className="flex gap-4">
            <PixelButton
              autoFocus
              aria-pressed={period === "weekly"}
              onClick={() => setPeriod("weekly")}
            >
              Weekly
            </PixelButton>
            <PixelButton aria-pressed={period === "all"} onClick={() => setPeriod("all")}>
              All-time
            </PixelButton>
            <span className="w-8" />
            <PixelButton aria-pressed={kind === "fastest"} onClick={() => setKind("fastest")}>
              Fastest
            </PixelButton>
            <PixelButton aria-pressed={kind === "deepest"} onClick={() => setKind("deepest")}>
              Deepest
            </PixelButton>
          </div>
          <LeaderboardTable period={period} kind={kind} />
        </>
      )}
      <PixelButton variant="ghost" className="mt-auto self-start" onClick={() => goTo("staging")}>
        ← Staging Bay
      </PixelButton>
    </div>
  );
}
