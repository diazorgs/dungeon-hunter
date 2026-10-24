import { readTelemetry, summarizeTelemetry } from "../../game/logic/telemetry.ts";
import { safeLocalStorage } from "../../profile/local.ts";

/** DEV only: the local balance log at a glance (plan 26 targets: 20–30 min runs, 10–20% wins). */
export function TelemetryPanel() {
  const s = summarizeTelemetry(readTelemetry(safeLocalStorage()));
  return (
    <aside className="border-2 border-dashed border-steel-700 px-2 py-1 text-sm text-steel-400">
      DEV telemetry · {s.runs} runs · median {s.medianMinutes.toFixed(1)} min · wins{" "}
      {Math.round(s.winRate * 100)}% · deaths S1/S2/S3 {s.deathsBySector[1]}/{s.deathsBySector[2]}/
      {s.deathsBySector[3]}
      {s.deadliest.length ? ` · deadliest: ${s.deadliest.join(", ")}` : ""}
    </aside>
  );
}
