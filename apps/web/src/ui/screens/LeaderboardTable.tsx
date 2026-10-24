import { RUNNERS } from "@dh/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../app/repos.ts";
import { errorCode } from "../../lib/api.ts";
import type { Kind, Period } from "./LeaderboardScreen.tsx";

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function LeaderboardTable({ period, kind }: { period: Period; kind: Kind }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["leaderboard", period, kind],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await api.api.leaderboard.$get({ query: { period, kind } });
      if (res.status !== 200) throw new Error(await errorCode(res));
      return (await res.json()).entries;
    },
  });
  if (isPending) return <p className="text-base text-steel-400">Loading…</p>;
  if (isError) return <p className="text-base text-hp">Leaderboard unavailable right now.</p>;
  if (!data.length)
    return (
      <p className="text-base text-steel-400">
        No {period === "all" ? "all-time" : period} {kind} runs yet.
      </p>
    );
  return (
    <table className="w-full text-base">
      <thead className="text-left text-steel-400">
        <tr>
          <th className="py-1">#</th>
          <th>Runner</th>
          <th>Unit</th>
          <th>{kind === "fastest" ? "Time" : "Depth"}</th>
        </tr>
      </thead>
      <tbody className="text-steel-200">
        {data.map((e) => (
          <tr key={e.rank}>
            <td className="py-1">{e.rank}</td>
            <td>{e.username}</td>
            <td>{RUNNERS[e.runnerId].name}</td>
            <td>
              {kind === "fastest"
                ? mmss(e.durationSec)
                : `Sector ${e.sectorReached} · ${e.roomsCleared} rooms · ${mmss(e.durationSec)}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
