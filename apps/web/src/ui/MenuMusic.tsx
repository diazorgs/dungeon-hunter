import { useEffect, useRef } from "react";
import { useSettingsStore } from "../stores/settings.ts";

/** Lobby loop for every React screen; follows the music volume live. Starts on the first input. */
export function MenuMusic({ src }: { src: string }) {
  const volume = useSettingsStore((s) => s.settings.musicVolume);
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const a = ref.current!;
    a.volume = volume;
    if (volume === 0) {
      a.pause();
      return;
    }
    // Browsers block autoplay until a gesture; retry on the first one.
    const go = () => void a.play().catch(() => undefined);
    a.play().catch(() => {
      addEventListener("pointerdown", go, { once: true });
      addEventListener("keydown", go, { once: true });
    });
    return () => {
      removeEventListener("pointerdown", go);
      removeEventListener("keydown", go);
    };
  }, [volume]);
  return <audio ref={ref} src={src} loop preload="none" />;
}
