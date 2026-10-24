import type { Card } from "@dh/shared";
import { useEffect, useEffectEvent, useState } from "react";
import { PixelButton } from "../components/PixelButton.tsx";

const ART: Record<string, string> = {
  "card-veyra": "var(--color-amber-500)",
  "card-vault": "var(--color-steel-500)",
  "card-malfunction": "var(--color-bleed-500)",
  "card-runner": "var(--color-teal-400)",
  "card-shutdown": "var(--color-steel-700)",
  "card-vigil": "var(--color-teal-200)",
  "card-veyra-lights": "var(--color-scrap)",
};

/** Story cards (intro, ending): Enter/click advances, Esc skips all. */
export function CardsScreen({
  cards,
  onDone,
  extra,
}: {
  cards: Card[];
  onDone: () => void;
  extra?: React.ReactNode;
}) {
  const [i, setI] = useState(0);
  const last = i >= cards.length - 1;
  const next = () => (last && !extra ? onDone() : setI((n) => Math.min(n + 1, cards.length)));
  const card = cards[i];
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") onDone();
  });
  useEffect(() => {
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-16">
      {card ? (
        <>
          {/* shortcut: flat colour panels stand in for card art until it is drawn. */}
          <div
            className="h-56 w-[480px] border-2 border-steel-700"
            style={{
              background: `repeating-linear-gradient(0deg, var(--color-ink) 0 8px, var(--color-steel-900) 8px 16px), ${ART[card.art] ?? "var(--color-steel-800)"}`,
              backgroundBlendMode: "multiply",
              boxShadow: `inset 0 0 0 8px ${ART[card.art] ?? "var(--color-steel-800)"}`,
            }}
            aria-hidden
          />
          <div className="min-h-24 w-[640px] space-y-2 text-center text-2xl text-steel-200">
            {card.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        </>
      ) : (
        extra
      )}
      <div className="flex gap-4">
        <PixelButton autoFocus onClick={card ? next : onDone}>
          {card && !(last && !extra) ? "Next" : "Continue"}
        </PixelButton>
        <PixelButton variant="ghost" onClick={onDone}>
          Skip (Esc)
        </PixelButton>
      </div>
    </div>
  );
}
