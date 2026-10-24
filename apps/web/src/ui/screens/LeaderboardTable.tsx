import type { Kind, Period } from "./LeaderboardScreen.tsx";

// Data arrives with the API in plan 25.
export function LeaderboardTable({ period, kind }: { period: Period; kind: Kind }) {
  return (
    <p className="text-base text-steel-400">
      No {period === "all" ? "all-time" : period} {kind} runs yet.
    </p>
  );
}
