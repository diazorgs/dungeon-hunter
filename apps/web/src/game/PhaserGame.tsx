import Phaser from "phaser";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { bus } from "./bridge/bus.ts";
import type { RunConfig, RunSummary } from "./bridge/types.ts";
import { createGameConfig, GAME_HEIGHT, GAME_WIDTH } from "./config.ts";
import { installCrashHandler } from "./errorHandler.ts";

const largestIntegerScale = () =>
  Math.max(1, Math.min(Math.floor(innerWidth / GAME_WIDTH), Math.floor(innerHeight / GAME_HEIGHT)));

const CAPTURED_KEYS = new Set([" ", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/** Owns one Phaser.Game for the lifetime of a run. React and Phaser talk only via `bus`. */
export function PhaserGame({
  config,
  onRunEnded,
  onCrash,
}: {
  config: RunConfig;
  onRunEnded: (summary: RunSummary) => void;
  onCrash: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(largestIntegerScale);

  useLayoutEffect(() => {
    const host = hostRef.current!;
    const game = new Phaser.Game(createGameConfig(host, config));
    const off = bus.on("run:ended", onRunEnded);
    // Unmounting (via onCrash → crash screen) destroys the game below.
    const offCrash = installCrashHandler(onCrash);
    if (import.meta.env.DEV) Object.assign(window, { __dh: { bus, game } });
    host.focus();
    return () => {
      off();
      offCrash();
      game.destroy(true);
    };
    // The game is created once per run; config changes mean a new run (new mount).
    // eslint-disable-next-line react/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => setScale(largestIntegerScale());
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="grid h-screen w-screen place-items-center overflow-hidden bg-[#0b0d12]">
      <div
        ref={hostRef}
        tabIndex={0}
        aria-label="Game"
        className="cursor-none outline-none"
        style={{ width: GAME_WIDTH * scale, height: GAME_HEIGHT * scale }}
        onKeyDown={(e) => CAPTURED_KEYS.has(e.key) && e.preventDefault()}
      />
    </div>
  );
}
