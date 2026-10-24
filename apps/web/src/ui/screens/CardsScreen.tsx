import type { Card } from "@dh/shared";
import { useEffect, useEffectEvent, useState } from "react";
import { PixelButton } from "../components/PixelButton.tsx";

const CHARS_PER_SEC = 45;
/** Typing starts from 0 per card; with reduced motion the whole text shows at once. */
const typeStart = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? Infinity : 0);

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
  const [typed, setTyped] = useState(typeStart);
  const last = i >= cards.length - 1;
  const card = cards[i];
  const text = card?.lines.join("\n") ?? "";
  const typing = typed < text.length;
  // First press finishes the line being typed; the next one advances.
  const next = () => {
    if (typing) return setTyped(text.length);
    if (last && !extra) return onDone();
    setI((n) => Math.min(n + 1, cards.length));
    setTyped(typeStart());
  };
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") onDone();
  });
  useEffect(() => {
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!typing) return;
    const t = setInterval(() => setTyped((n) => n + 1), 1000 / CHARS_PER_SEC);
    return () => clearInterval(t);
  }, [typing]);
  const shown = text.slice(0, typed).split("\n");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8">
      {card ? (
        <>
          <div
            key={card.id}
            className="card-in relative h-56 w-[480px] overflow-hidden border-2 border-steel-600 shadow-[0_0_0_4px_var(--color-ink)]"
          >
            <img
              src={`/assets/cards/${card.art}.png`}
              alt=""
              className="card-pan h-full w-full [image-rendering:pixelated]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_2px,rgb(0_0_0/0.2)_2px_4px)]"
            />
          </div>
          <div className="flex gap-2" aria-hidden>
            {cards.map((c, n) => (
              <span
                key={c.id}
                className={`h-2 w-6 ${n === i ? "bg-amber-500" : n < i ? "bg-steel-500" : "bg-steel-800"}`}
              />
            ))}
          </div>
          <div
            className="min-h-24 w-[640px] space-y-2 text-center text-2xl text-steel-200"
            aria-label={card.lines.join(" ")}
          >
            {card.lines.map((l, n) => (
              <p key={l} aria-hidden>
                {shown[n] ?? ""}
                {typing && n === shown.length - 1 ? <span className="animate-pulse">_</span> : null}
              </p>
            ))}
          </div>
        </>
      ) : (
        extra
      )}
      <div className="flex gap-4">
        <PixelButton autoFocus onClick={card ? next : onDone}>
          {typing ? "Next" : card && !(last && !extra) ? "Next" : "Continue"}
        </PixelButton>
        <PixelButton variant="ghost" onClick={onDone}>
          Skip (Esc)
        </PixelButton>
      </div>
    </div>
  );
}
