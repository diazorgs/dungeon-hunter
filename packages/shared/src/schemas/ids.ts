export const RUNNER_IDS = ["vex", "kit"] as const;
export const WEAPON_IDS = [
  "rust-pistol",
  "shock-baton",
  "rivet-smg",
  "breach-shotgun",
  "line-rifle",
  "arc-carbine",
  "scatter-coil",
  "pulse-lance",
  "grid-cutter",
  "fuse-launcher",
  "static-repeater",
  "null-cannon",
] as const;
export const GUARDIAN_IDS = [
  "sentry-drone",
  "crawler",
  "turret-node",
  "shield-bot",
  "arc-spider",
  "mortar-unit",
  "bleed-wraith",
] as const;
export const BOSS_IDS = ["gatekeeper", "conduit-hydra", "core-warden"] as const;
export const MOD_IDS = [
  "cooling-fins",
  "spare-cell",
  "battery-pack",
  "overclock-core",
  "ricochet-chip",
  "scrap-magnet",
  "dash-coil",
  "field-patch",
  "thorn-plating",
  "lucky-seal",
] as const;
export const LOG_IDS = [
  "s1-log-1",
  "s1-log-2",
  "s1-log-3",
  "s2-log-1",
  "s2-log-2",
  "s2-log-3",
  "s3-log-1",
  "s3-log-2",
  "s3-log-3",
] as const;

export type RunnerId = (typeof RUNNER_IDS)[number];
export type WeaponId = (typeof WEAPON_IDS)[number];
export type GuardianId = (typeof GUARDIAN_IDS)[number];
export type BossId = (typeof BOSS_IDS)[number];
export type ModId = (typeof MOD_IDS)[number];
export type LogId = (typeof LOG_IDS)[number];
export type SectorId = 1 | 2 | 3;
