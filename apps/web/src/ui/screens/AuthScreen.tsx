import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { accountRepo, api, localRepo } from "../../app/repos.ts";
import { errorCode } from "../../lib/api.ts";
import type { Profile } from "../../profile/types.ts";
import { useSessionStore } from "../../stores/session.ts";
import { Panel } from "../components/Panel.tsx";
import { PixelButton } from "../components/PixelButton.tsx";
import { useBackKey } from "../components/useBackKey.ts";
import { ImportPrompt } from "./ImportPrompt.tsx";

const MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: "That email already has an account. Log in instead.",
  USERNAME_TAKEN: "That username is taken.",
  INVALID_CREDENTIALS: "Email or password is wrong.",
  VALIDATION:
    "Check the fields: a valid email, a password of 8+ characters, a username of 3–16 a-z, 0-9 or _.",
};

const hasProgress = (p: Profile) =>
  p.coreShards > 0 || p.unlocks.length > 0 || p.vaultLogs.length > 0 || p.stats.totalRuns > 0;

const field =
  "w-full border-2 border-steel-700 bg-steel-900 px-2 py-1 text-steel-200 focus-visible:border-amber-500 focus-visible:outline-2 focus-visible:outline-bone";

export function AuthScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const backTo = useSessionStore((s) => s.backTo);
  const qc = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guest, setGuest] = useState<Profile | null>(null);
  const back = () => goTo(backTo === "auth" ? "title" : (backTo as "title"));
  useBackKey(back);

  const enterAccount = async () => {
    useSessionStore.setState({ authMode: "account" });
    await accountRepo.replayPendingRun();
    await qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => (f.get(k) as string | null) ?? "";
    const email = get("email");
    const password = get("password");
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await api.api.auth.login.$post({ json: { email, password } })
          : await api.api.auth.register.$post({
              json: { email, password, username: get("username") },
            });
      if (!res.ok) {
        const code = await errorCode(res);
        setError(
          MESSAGES[code] ??
            (code.startsWith("HTTP_5")
              ? "Could not reach the server. Your progress is safe on this device."
              : `Something went wrong (${code}).`),
        );
        return;
      }
      const local = await localRepo.load();
      await enterAccount();
      if (mode === "register" && hasProgress(local)) setGuest(local);
      else back();
    } catch {
      setError("Could not reach the server. Your progress is safe on this device.");
    } finally {
      setBusy(false);
    }
  };

  if (guest) return <ImportPrompt guest={guest} onDone={back} />;
  return (
    <div className="flex h-full items-center justify-center">
      <Panel title={mode === "login" ? "Log in" : "Create account"} className="w-[480px]">
        <form onSubmit={(e) => void submit(e)} className="space-y-4 text-base">
          <label className="block">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className={field}
            />
          </label>
          <label className="block">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : 1}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={field}
            />
          </label>
          {mode === "register" ? (
            <label className="block">
              Username
              <input
                name="username"
                required
                pattern="[a-z0-9_]{3,16}"
                title="3–16 characters: a-z, 0-9 or _"
                autoComplete="username"
                className={field}
              />
            </label>
          ) : null}
          <p className="min-h-6 text-hp" role="alert">
            {error}
          </p>
          <div className="flex gap-4">
            <PixelButton type="submit" disabled={busy}>
              {mode === "login" ? "Log in" : "Register"}
            </PixelButton>
            <PixelButton
              variant="ghost"
              onClick={() => {
                setError(null);
                setMode(mode === "login" ? "register" : "login");
              }}
            >
              {mode === "login" ? "New? Register" : "Have an account? Log in"}
            </PixelButton>
          </div>
          <PixelButton variant="ghost" onClick={back}>
            ← Back (Esc)
          </PixelButton>
        </form>
      </Panel>
    </div>
  );
}
