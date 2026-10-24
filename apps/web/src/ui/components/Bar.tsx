import type { PaletteToken } from "@dh/shared";

export function Bar({ value, max, colour }: { value: number; max: number; colour: PaletteToken }) {
  return (
    <div className="h-2 w-full bg-steel-900" role="meter" aria-valuenow={value} aria-valuemax={max}>
      <div
        className="h-full"
        style={{ width: `${(100 * value) / max}%`, background: `var(--color-${colour})` }}
      />
    </div>
  );
}
