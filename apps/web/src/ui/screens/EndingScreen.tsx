import { CARDS } from "@dh/shared";
import { useEffect, useState } from "react";
import { useMarkSeen } from "../../profile/queries.ts";
import { useSessionStore } from "../../stores/session.ts";
import { CardsScreen } from "./CardsScreen.tsx";

/** Section headings and bullet names from CREDITS.md, so credits have one source. */
const parseCredits = (md: string) =>
  md
    .split("\n")
    .filter((l) => l.startsWith("- **"))
    .map((l) => l.replace(/^- \*\*(.+?):?\*\*:?\s*/, "$1: ").replace(/[`*[\]]|\(http[^)]*\)/g, ""));

export function EndingScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const markSeen = useMarkSeen();
  const [credits, setCredits] = useState<string[]>([]);
  useEffect(() => {
    fetch("/assets/CREDITS.md")
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => setCredits(parseCredits(t)))
      .catch(() => setCredits([]));
  }, []);
  const done = () => {
    markSeen.mutate("ending");
    goTo("staging");
  };
  return (
    <CardsScreen
      cards={CARDS.ending}
      onDone={done}
      extra={
        <div className="w-[720px] text-center">
          <h2 className="mb-8 text-[32px] text-amber-300">CREDITS</h2>
          <p className="mb-4 text-base text-steel-200">Dungeon Hunter, made by Diaz Farindra.</p>
          <ul className="space-y-2 text-base text-steel-400">
            {credits.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      }
    />
  );
}
