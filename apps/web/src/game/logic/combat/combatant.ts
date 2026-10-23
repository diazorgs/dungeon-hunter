export const SHIELD_REGEN_DELAY_MS = 3000;
export const SHIELD_REGEN_INTERVAL_MS = 1000;
export const HIT_INVULN_MS = 500;

export interface CombatantState {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  lastDamagedAt: number;
  invulnUntil: number;
  nextRegenAt: number;
  dead: boolean;
}

export interface DamageResult {
  ignored: boolean;
  shieldLost: number;
  hpLost: number;
  died: boolean;
}

export function createCombatant(base: {
  hp: number;
  shield: number;
  energy: number;
}): CombatantState {
  return {
    hp: base.hp,
    maxHp: base.hp,
    shield: base.shield,
    maxShield: base.shield,
    energy: base.energy,
    maxEnergy: base.energy,
    lastDamagedAt: -Infinity,
    invulnUntil: -Infinity,
    nextRegenAt: -Infinity,
    dead: false,
  };
}

const IGNORED: DamageResult = { ignored: true, shieldLost: 0, hpLost: 0, died: false };

export function applyDamage(s: CombatantState, amount: number, now: number): DamageResult {
  if (s.dead || amount <= 0 || now < s.invulnUntil) return IGNORED;
  const shieldLost = Math.min(s.shield, amount);
  const hpLost = Math.min(s.hp, amount - shieldLost);
  s.shield -= shieldLost;
  s.hp -= hpLost;
  // Even a fully absorbed hit restarts the regen delay.
  s.lastDamagedAt = now;
  s.nextRegenAt = now + SHIELD_REGEN_DELAY_MS;
  grantInvuln(s, now, HIT_INVULN_MS);
  const died = s.hp === 0;
  if (died) s.dead = true;
  return { ignored: false, shieldLost, hpLost, died };
}

/** Extends invulnerability to `now + ms`; never shortens an existing window. */
export function grantInvuln(s: CombatantState, now: number, ms: number): void {
  s.invulnUntil = Math.max(s.invulnUntil, now + ms);
}

/** Returns shield gained; a long gap only pays the whole seconds that elapsed. */
export function tickShieldRegen(s: CombatantState, now: number): number {
  if (s.dead || s.shield >= s.maxShield || now < s.nextRegenAt) return 0;
  const ticks = Math.floor((now - s.nextRegenAt) / SHIELD_REGEN_INTERVAL_MS) + 1;
  const gained = Math.min(ticks, s.maxShield - s.shield);
  s.shield += gained;
  s.nextRegenAt += ticks * SHIELD_REGEN_INTERVAL_MS;
  return gained;
}

export function heal(s: CombatantState, n: number): number {
  if (s.dead) return 0;
  const gained = Math.max(0, Math.min(n, s.maxHp - s.hp));
  s.hp += gained;
  return gained;
}

/** All-or-nothing: spends nothing and returns false when energy is short. */
export function spendEnergy(s: CombatantState, n: number): boolean {
  if (s.energy < n) return false;
  s.energy -= n;
  return true;
}

export function gainEnergy(s: CombatantState, n: number): number {
  const gained = Math.max(0, Math.min(n, s.maxEnergy - s.energy));
  s.energy += gained;
  return gained;
}
