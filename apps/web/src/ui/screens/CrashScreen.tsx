import { useSessionStore } from "../../stores/session.ts";
import { Panel } from "../components/Panel.tsx";
import { PixelButton } from "../components/PixelButton.tsx";

/** Shown when a run (or a screen) hits an uncaught error. Progress already saved is untouched. */
export function CrashScreen({ onReturn }: { onReturn?: () => void }) {
  const goTo = useSessionStore((s) => s.goTo);
  const message = useSessionStore((s) => s.crashMessage);
  return (
    <div className="flex h-full items-center justify-center">
      <Panel title="Signal lost" className="w-[560px] text-base">
        <p className="mb-4">
          Something broke and the run had to stop. Your Core Shards and unlocks are safe.
        </p>
        {message ? <p className="mb-8 break-words text-steel-400">Error: {message}</p> : null}
        <PixelButton autoFocus onClick={onReturn ?? (() => goTo("staging"))}>
          Return to Staging Bay
        </PixelButton>
      </Panel>
    </div>
  );
}
