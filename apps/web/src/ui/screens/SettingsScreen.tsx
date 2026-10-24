import { useSessionStore } from "../../stores/session.ts";
import { useSettingsStore } from "../../stores/settings.ts";
import { useBackKey } from "../components/useBackKey.ts";
import { Panel } from "../components/Panel.tsx";
import { PixelButton } from "../components/PixelButton.tsx";

// PRD controls table; fixed bindings, no remapping in the MVP.
const KEYS: [string, string][] = [
  ["Move", "WASD"],
  ["Aim / fire", "Mouse / left click"],
  ["Skill", "Right click or Space"],
  ["Dash", "Shift"],
  ["Swap weapon", "Q or mouse wheel"],
  ["Interact", "E"],
  ["Map", "Tab"],
  ["Pause", "Esc"],
];

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid grid-cols-[160px_1fr_56px] items-center gap-4">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="accent-amber-500 focus-visible:outline-2 focus-visible:outline-bone"
      />
      <span className="text-right">{Math.round(value * 100)}%</span>
    </label>
  );
}

export function SettingsScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const backTo = useSessionStore((s) => s.backTo);
  const { settings, update } = useSettingsStore();
  const back = () => goTo(backTo === "settings" ? "title" : (backTo as "title"));
  useBackKey(back);
  return (
    <div className="flex h-full flex-col gap-4 p-16">
      <h1 className="text-[32px] text-steel-200">SETTINGS</h1>
      <div className="grid flex-1 grid-cols-2 gap-8 text-base">
        <Panel title="Game">
          <div className="space-y-4">
            <Slider
              label="Music"
              value={settings.musicVolume}
              onChange={(v) => update({ musicVolume: v })}
            />
            <Slider
              label="SFX"
              value={settings.sfxVolume}
              onChange={(v) => update({ sfxVolume: v })}
            />
            <Slider
              label="Screen shake"
              value={settings.screenShake}
              onChange={(v) => update({ screenShake: v })}
            />
            <fieldset className="grid grid-cols-[160px_1fr] items-center gap-4">
              <legend className="sr-only">Aim mode</legend>
              <span aria-hidden>Aim</span>
              <div className="flex gap-4">
                {(["soft", "full"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="aim"
                      checked={settings.aimMode === m}
                      onChange={() => update({ aimMode: m })}
                      className="accent-amber-500"
                    />
                    {m === "soft" ? "Soft assist" : "Full auto-aim"}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={settings.damageNumbers}
                onChange={(e) => update({ damageNumbers: e.target.checked })}
                className="accent-amber-500"
              />
              Damage numbers
            </label>
          </div>
        </Panel>
        <Panel title="Controls">
          <table className="w-full">
            <tbody>
              {KEYS.map(([action, key]) => (
                <tr key={action}>
                  <th scope="row" className="py-1 text-left font-normal text-steel-400">
                    {action}
                  </th>
                  <td className="text-steel-200">{key}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <PixelButton autoFocus variant="ghost" className="self-start" onClick={back}>
        ← Back (Esc)
      </PixelButton>
    </div>
  );
}
