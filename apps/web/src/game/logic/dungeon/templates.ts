import type { SectorId } from "@dh/shared";
import type { Rng } from "@dh/utils";
import type { Dir, DungeonLayout, RoomType } from "./types.ts";

export interface TemplateMeta {
  id: string;
  roomType: RoomType;
  sectors: SectorId[];
  /** Doors the template can open. */
  doors: Dir[];
}

/** Picks a template per room by type, sector and door support; avoids repeating combat rooms. */
export function assignTemplates(
  layout: DungeonLayout,
  catalog: readonly TemplateMeta[],
  rng: Rng,
): DungeonLayout {
  const used = new Set<string>();
  const rooms = layout.rooms.map((room) => {
    const fits = catalog.filter(
      (t) =>
        t.roomType === room.type &&
        t.sectors.includes(layout.sector) &&
        room.doors.every((d) => t.doors.includes(d)),
    );
    if (fits.length === 0)
      throw new Error(
        `No template for ${room.type} room ${room.id} in sector ${layout.sector} with doors ${room.doors.join(",")}`,
      );
    const fresh = fits.filter((t) => !used.has(t.id));
    const pick = rng.pick(fresh.length > 0 ? fresh : fits);
    used.add(pick.id);
    return { ...room, templateId: pick.id };
  });
  return { ...layout, rooms };
}
