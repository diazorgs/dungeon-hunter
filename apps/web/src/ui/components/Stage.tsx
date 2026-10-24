import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { MenuMusic } from "../MenuMusic.tsx";

const W = 960;
const H = 540;
const fit = () => {
  const s = Math.min(innerWidth / W, innerHeight / H);
  // Integer scale when there is room, so pixel art stays crisp; shrink smoothly only below 1×.
  return s >= 1 ? Math.floor(s) : s;
};

/** Centred 960×540 stage (DESIGN.md §11.4). */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(fit);
  useEffect(() => {
    const onResize = () => setScale(fit());
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden bg-void">
      <div style={{ width: W * scale, height: H * scale }}>
        <main
          className="relative origin-top-left overflow-hidden bg-void text-steel-300"
          style={{ width: W, height: H, transform: `scale(${scale})` }}
        >
          {children}
        </main>
        <MenuMusic src="/assets/audio/music/lobby.wav" />
      </div>
    </div>
  );
}
