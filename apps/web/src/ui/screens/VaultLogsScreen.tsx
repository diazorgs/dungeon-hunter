import { LOG_IDS, LOGS } from "@dh/shared";
import type { LogId } from "@dh/shared";
import { useState } from "react";
import { useProfile } from "../../profile/queries.ts";
import { useSessionStore } from "../../stores/session.ts";
import { Panel } from "../components/Panel.tsx";
import { PixelButton } from "../components/PixelButton.tsx";
import { useMenuNav } from "../components/useMenuNav.ts";

const SECTOR_NAMES = ["Storage Wing", "Conduit Works", "Core Approach"];
// Grid order: one column per sector, so arrow keys match what the eye sees.
const GRID: LogId[] = [0, 1, 2].flatMap((row) =>
  [0, 1, 2].map((sector) => LOG_IDS[sector * 3 + row]!),
);

export function VaultLogsScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const { data: profile } = useProfile();
  const [open, setOpen] = useState<LogId | null>(null);
  const nav = useMenuNav(GRID.length, {
    columns: 3,
    onSelect: (i) => setOpen(GRID[i]!),
    onBack: () => goTo("staging"),
  });
  if (!profile) return null;
  const has = (id: LogId) => profile.vaultLogs.includes(id);
  return (
    <div className="flex h-full flex-col gap-4 p-16">
      <h1 className="text-[32px] text-steel-200">VAULT LOGS</h1>
      <div className="grid flex-1 grid-cols-[1fr_384px] gap-8">
        <div className="grid grid-cols-3 content-start gap-x-4 gap-y-2">
          {SECTOR_NAMES.map((n) => (
            <h2 key={n} className="text-base text-steel-400 uppercase">
              {n}
            </h2>
          ))}
          {GRID.map((id, i) => (
            <PixelButton
              key={id}
              className="normal-case"
              {...nav.getItemProps(i)}
              aria-label={has(id) ? LOGS[id].title : "Signal missing"}
            >
              {has(id) ? LOGS[id].title : "[ SIGNAL MISSING ]"}
            </PixelButton>
          ))}
        </div>
        <Panel title={open && has(open) ? LOGS[open].title : "—"}>
          <div className="space-y-4 text-base text-teal-200">
            {open && has(open) ? (
              LOGS[open].lines.map((l) => <p key={l}>{l}</p>)
            ) : (
              <p className="text-steel-400">
                {open ? "[ SIGNAL MISSING ] Find this log in a run." : "Select a log to read it."}
              </p>
            )}
          </div>
        </Panel>
      </div>
      <PixelButton variant="ghost" className="self-start" onClick={() => goTo("staging")}>
        ← Staging Bay (Esc)
      </PixelButton>
    </div>
  );
}
