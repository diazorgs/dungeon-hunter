import { lazy, Suspense, useRef } from "react";
import type { RunSummary } from "../game/bridge/types.ts";
import { useSubmitRun } from "../profile/queries.ts";
import { ProfileError } from "../profile/types.ts";
import { useSessionStore } from "../stores/session.ts";
import { Stage } from "../ui/components/Stage.tsx";
import { ArmoryScreen } from "../ui/screens/ArmoryScreen.tsx";
import { AuthScreen } from "../ui/screens/AuthScreen.tsx";
import { EndingScreen } from "../ui/screens/EndingScreen.tsx";
import { IntroScreen } from "../ui/screens/IntroScreen.tsx";
import { LeaderboardScreen } from "../ui/screens/LeaderboardScreen.tsx";
import { ResultsScreen } from "../ui/screens/ResultsScreen.tsx";
import { SettingsScreen } from "../ui/screens/SettingsScreen.tsx";
import { StagingBayScreen } from "../ui/screens/StagingBayScreen.tsx";
import { TitleScreen } from "../ui/screens/TitleScreen.tsx";
import { VaultLogsScreen } from "../ui/screens/VaultLogsScreen.tsx";
import { useStartRun } from "./useStartRun.ts";

// Phaser is the heaviest chunk; the menus must not wait for it.
const PhaserGame = lazy(() =>
  import("../game/PhaserGame.tsx").then((m) => ({ default: m.PhaserGame })),
);

export function AppRouter() {
  const screen = useSessionStore((s) => s.screen);
  const runConfig = useSessionStore((s) => s.runConfig);
  const summary = useSessionStore((s) => s.lastRunSummary);
  const endRun = useSessionStore((s) => s.endRun);
  const submit = useSubmitRun();
  const startRun = useStartRun();
  const submitted = useRef("");

  // Submitting from the run-end event (not a Results effect) means StrictMode can't double-pay.
  // The key guards a repeated run:ended for the same run.
  const onRunEnded = (s: RunSummary) => {
    endRun(s);
    const key = `${s.result.seed}:${s.result.durationSec}:${s.result.kills}`;
    if (submitted.current === key) return;
    submitted.current = key;
    submit.mutate(s.result);
  };

  if (screen === "run" && runConfig)
    return (
      <Suspense fallback={<div className="h-full bg-void" />}>
        <PhaserGame config={runConfig} onRunEnded={onRunEnded} />
      </Suspense>
    );
  return <Stage>{renderScreen()}</Stage>;

  function renderScreen() {
    switch (screen) {
      case "intro":
        return <IntroScreen />;
      case "auth":
        return <AuthScreen />;
      case "staging":
        return <StagingBayScreen />;
      case "armory":
        return <ArmoryScreen />;
      case "logs":
        return <VaultLogsScreen />;
      case "leaderboard":
        return <LeaderboardScreen />;
      case "settings":
        return <SettingsScreen />;
      case "ending":
        return <EndingScreen />;
      case "results":
        return summary ? (
          <ResultsScreen
            summary={summary}
            reward={submit.data}
            pending={submit.isPending}
            error={
              submit.error
                ? submit.error instanceof ProfileError && submit.error.code === "UNAUTHORIZED"
                  ? "Session expired. Log in again and this run is saved then."
                  : submit.error instanceof ProfileError && !submit.error.code.startsWith("HTTP_5")
                    ? submit.error.code
                    : "Could not reach the server. Log in again later to save this run."
                : null
            }
            onRunAgain={startRun}
          />
        ) : (
          <TitleScreen />
        );
      default:
        return <TitleScreen />;
    }
  }
}
