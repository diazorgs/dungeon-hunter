import { GUEST_IMPORT_MAX_SHARDS } from "@dh/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../app/repos.ts";
import { errorCode } from "../../lib/api.ts";
import type { Profile } from "../../profile/types.ts";
import { Panel } from "../components/Panel.tsx";
import { PixelButton } from "../components/PixelButton.tsx";

/** Once per account: carry this device's guest progress over (shards capped server-side). */
export function ImportPrompt({ guest, onDone }: { guest: Profile; onDone: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const doImport = async () => {
    setBusy(true);
    try {
      const res = await api.api.me.import.$post({
        json: {
          coreShards: guest.coreShards,
          unlocks: guest.unlocks,
          vaultLogs: guest.vaultLogs,
          stats: guest.stats,
        },
      });
      if (!res.ok && (await errorCode(res)) !== "IMPORT_USED") {
        setError("Import failed. You can keep playing; guest progress stays on this device.");
        return;
      }
      await qc.invalidateQueries({ queryKey: ["profile"] });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex h-full items-center justify-center">
      <Panel title="Bring your guest progress?" className="w-[560px] text-base">
        <p className="mb-2">This device has progress from playing as a guest:</p>
        <ul className="mb-4 text-steel-200">
          <li>◆ {Math.min(guest.coreShards, GUEST_IMPORT_MAX_SHARDS)} Core Shards</li>
          <li>{guest.unlocks.length} Armory unlocks</li>
          <li>{guest.vaultLogs.length} Vault Logs</li>
        </ul>
        <p className="mb-8 text-steel-400">
          You can import it once. Shards are capped at {GUEST_IMPORT_MAX_SHARDS}.
        </p>
        <p className="min-h-6 text-hp" role="alert">
          {error}
        </p>
        <div className="flex gap-4">
          <PixelButton autoFocus disabled={busy} onClick={() => void doImport()}>
            Import once
          </PixelButton>
          <PixelButton variant="ghost" onClick={onDone}>
            Skip
          </PixelButton>
        </div>
      </Panel>
    </div>
  );
}
