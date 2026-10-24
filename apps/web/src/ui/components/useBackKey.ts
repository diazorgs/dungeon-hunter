import { useEffect, useEffectEvent } from "react";

/** Esc (or gamepad B via useMenuNav screens) goes back, wherever focus is. */
export function useBackKey(onBack: () => void): void {
  const back = useEffectEvent(onBack);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && back();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
}
