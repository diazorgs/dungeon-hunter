import { useEffect, useEffectEvent, useRef, useState } from "react";

const PAD = { up: 12, down: 13, left: 14, right: 15, a: 0, b: 1 } as const;

/**
 * Arrow keys (and a gamepad D-pad) move focus between `count` items in a grid of `columns`;
 * Enter/click selects, Esc goes back. Items are real buttons, so Tab works too.
 */
export function useMenuNav(
  count: number,
  opts: { columns?: number; onSelect: (i: number) => void; onBack?: () => void },
) {
  const columns = opts.columns ?? 1;
  const [index, setIndex] = useState(0);
  const items = useRef<(HTMLElement | null)[]>([]);

  const move = useEffectEvent((dir: "up" | "down" | "left" | "right") => {
    const step = { up: -columns, down: columns, left: -1, right: 1 }[dir];
    const next = Math.min(count - 1, Math.max(0, index + step));
    setIndex(next);
    items.current[next]?.focus();
  });
  const back = useEffectEvent(() => opts.onBack?.());
  const select = useEffectEvent(() => items.current[index]?.click());

  useEffect(() => {
    items.current[0]?.focus();
    const keys: Record<string, "up" | "down" | "left" | "right"> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      // Sliders and text inputs own their arrow keys.
      if (e.target instanceof HTMLInputElement) return;
      const dir = keys[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      } else if (e.key === "Escape") back();
    };
    addEventListener("keydown", onKey);
    // Gamepad: poll while mounted, edge-triggered.
    let raf = 0;
    let prev = new Set<number>();
    const poll = () => {
      const pad = navigator.getGamepads?.().find((p) => p);
      const now = new Set<number>();
      pad?.buttons.forEach((b, i) => b.pressed && now.add(i));
      const pressed = (i: number) => now.has(i) && !prev.has(i);
      for (const dir of ["up", "down", "left", "right"] as const) if (pressed(PAD[dir])) move(dir);
      if (pressed(PAD.a)) select();
      if (pressed(PAD.b)) back();
      prev = now;
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, []);

  return {
    index,
    getItemProps: (i: number) => ({
      ref: (el: HTMLElement | null) => {
        items.current[i] = el;
      },
      onFocus: () => setIndex(i),
      onClick: () => opts.onSelect(i),
    }),
  };
}
