import { PixelButton } from "./PixelButton.tsx";
import { useMenuNav } from "./useMenuNav.ts";

export interface MenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

/** A vertical keyboard/gamepad-navigable button list. */
export function Menu({ items, onBack }: { items: MenuItem[]; onBack?: () => void }) {
  const nav = useMenuNav(items.length, { onSelect: (i) => items[i]!.action(), onBack });
  return (
    <nav className="flex flex-col gap-2">
      {items.map((item, i) => (
        <PixelButton key={item.label} disabled={item.disabled} {...nav.getItemProps(i)}>
          {item.label}
        </PixelButton>
      ))}
    </nav>
  );
}
