import { useSessionStore } from "../../stores/session.ts";
import { useBackKey } from "../components/useBackKey.ts";
import { Panel } from "../components/Panel.tsx";
import { PixelButton } from "../components/PixelButton.tsx";

export function AuthScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const backTo = useSessionStore((s) => s.backTo);
  useBackKey(() => goTo(backTo === "auth" ? "title" : (backTo as "title")));
  return (
    <div className="flex h-full items-center justify-center">
      <Panel title="Accounts arrive soon" className="w-[480px]">
        <p className="mb-8 text-base">
          Play as a guest for now. Your progress stays on this device.
        </p>
        <PixelButton
          autoFocus
          onClick={() => goTo(backTo === "auth" ? "title" : (backTo as "title"))}
        >
          ← Back
        </PixelButton>
      </Panel>
    </div>
  );
}
