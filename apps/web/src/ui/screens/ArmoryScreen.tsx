import { ARMORY, MODS, RUNNERS, WEAPONS } from "@dh/shared";
import type { ArmoryItem } from "@dh/shared";
import { useState } from "react";
import { usePurchase, useProfile } from "../../profile/queries.ts";
import { ProfileError } from "../../profile/types.ts";
import { useSessionStore } from "../../stores/session.ts";
import { PixelButton } from "../components/PixelButton.tsx";
import { ShardCount } from "../components/ShardCount.tsx";
import { useMenuNav } from "../components/useMenuNav.ts";

const TABS = [
  { type: "runner", label: "Runners" },
  { type: "weapon", label: "Weapons" },
  { type: "mod", label: "Mods" },
] as const;

// DESIGN.md §11.2 rarity colours.
const RARITY = { starter: "steel-300", common: "bone", rare: "teal-200", epic: "bleed-100" };

function describe(item: ArmoryItem): { name: string; detail: string; colour: string } {
  if (item.itemType === "runner") {
    const r = RUNNERS[item.itemId as keyof typeof RUNNERS];
    return { name: r.name, detail: r.title, colour: "amber-300" };
  }
  if (item.itemType === "weapon") {
    const w = WEAPONS[item.itemId as keyof typeof WEAPONS];
    return { name: w.name, detail: `${w.rarity} ${w.type}`, colour: RARITY[w.rarity] };
  }
  const m = MODS[item.itemId as keyof typeof MODS];
  return { name: m.name, detail: m.description, colour: "teal-200" };
}

export function ArmoryScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const { data: profile } = useProfile();
  const purchase = usePurchase();
  const [tab, setTab] = useState<(typeof TABS)[number]["type"]>("runner");
  const items = ARMORY.filter((a) => a.itemType === tab);
  // Tabs first, then the cards, all in one 3-column grid for arrow-key movement.
  const nav = useMenuNav(TABS.length + items.length, {
    columns: 3,
    onSelect: (i) => {
      if (i < TABS.length) return setTab(TABS[i]!.type);
      const item = items[i - TABS.length];
      if (item) purchase.mutate({ itemType: item.itemType, itemId: item.itemId });
    },
    onBack: () => goTo("staging"),
  });
  if (!profile) return null;
  const owns = (a: ArmoryItem) =>
    profile.unlocks.some((u) => u.itemType === a.itemType && u.itemId === a.itemId);
  const code = purchase.error instanceof ProfileError ? purchase.error.code : null;
  // A double click's second request lands on an item we already own: nothing went wrong.
  const error = code === "ALREADY_OWNED" ? null : code;
  return (
    <div className="flex h-full flex-col gap-4 p-16">
      <header className="flex items-baseline justify-between">
        <h1 className="text-[32px] text-steel-200">ARMORY</h1>
        <ShardCount shards={profile.coreShards} />
      </header>
      <div className="grid grid-cols-3 gap-4" role="tablist">
        {TABS.map((t, i) => (
          <PixelButton
            key={t.type}
            role="tab"
            aria-selected={tab === t.type}
            {...nav.getItemProps(i)}
          >
            {t.label}
          </PixelButton>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4" role="tabpanel">
        {items.map((a, i) => {
          const d = describe(a);
          const owned = owns(a);
          const cant = !owned && profile.coreShards < a.cost;
          return (
            <PixelButton
              key={a.itemId}
              disabled={owned || cant || purchase.isPending}
              className="normal-case"
              {...nav.getItemProps(TABS.length + i)}
            >
              <span className="block text-2xl" style={{ color: `var(--color-${d.colour})` }}>
                {d.name}
              </span>
              <span className="block min-h-12 text-base text-steel-400">{d.detail}</span>
              <span className={`block text-base ${owned ? "text-heal" : "text-scrap"}`}>
                {owned ? "OWNED" : cant ? `NEED ${a.cost} ◆` : `UNLOCK · ${a.cost} ◆`}
              </span>
            </PixelButton>
          );
        })}
      </div>
      <p className="min-h-6 text-base text-hp" role="status">
        {error === "INSUFFICIENT_SHARDS"
          ? "Not enough Core Shards."
          : error
            ? `Purchase failed (${error}).`
            : ""}
      </p>
      <div className="mt-auto">
        <PixelButton variant="ghost" onClick={() => goTo("staging")}>
          ← Staging Bay (Esc)
        </PixelButton>
      </div>
    </div>
  );
}
