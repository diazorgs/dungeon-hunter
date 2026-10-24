import { LOG_IDS, LOGS } from "@dh/shared";
import type { LogId, SectorId } from "@dh/shared";
import type { Rng } from "@dh/utils";

/** A log room offers an uncollected log, then one not read this run, then any of the sector's. */
export function pickLogForRoom(
  sector: SectorId,
  collected: readonly LogId[],
  foundThisRun: readonly LogId[],
  rng: Rng,
): LogId {
  const own = LOG_IDS.filter((id) => LOGS[id].sector === sector);
  const fresh = own.filter((id) => !collected.includes(id) && !foundThisRun.includes(id));
  const unread = own.filter((id) => !foundThisRun.includes(id));
  return rng.pick(fresh.length ? fresh : unread.length ? unread : own);
}
