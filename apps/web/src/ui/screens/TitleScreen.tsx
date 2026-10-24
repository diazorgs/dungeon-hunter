import { useProfile } from "../../profile/queries.ts";
import { useSessionStore } from "../../stores/session.ts";
import { Menu } from "../components/Menu.tsx";

export function TitleScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const authMode = useSessionStore((s) => s.authMode);
  const { data: profile } = useProfile();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-16">
      <div className="text-center">
        <h1 className="text-5xl text-amber-300">DUNGEON HUNTER</h1>
        <p className="mt-4 text-base text-steel-400">
          {authMode === "account" && profile?.username
            ? `Runner handler: ${profile.username}`
            : "Playing as guest. Progress stays on this device."}
        </p>
      </div>
      <div className="w-64">
        <Menu
          items={[
            {
              label: "Play",
              action: () => goTo(profile?.seenIntro ? "staging" : "intro"),
              disabled: !profile,
            },
            ...(authMode === "guest"
              ? [{ label: "Log in", action: () => goTo("auth", "title") }]
              : []),
            { label: "Settings", action: () => goTo("settings", "title") },
          ]}
        />
      </div>
    </div>
  );
}
