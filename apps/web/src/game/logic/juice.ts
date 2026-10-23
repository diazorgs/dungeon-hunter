export interface Shake {
  intensity: number;
  durationMs: number;
}

/** Weapon shake scaled by the setting; null when shake is disabled. */
export function scaledShake(weapon: { shake: Shake }, setting: number): Shake | null {
  if (setting <= 0) return null;
  return { intensity: weapon.shake.intensity * setting, durationMs: weapon.shake.durationMs };
}

/** Rapid fire must not stack into a permanent wobble: only a stronger or post-expiry shake wins. */
export function shouldReplaceShake(
  current: { intensity: number; endsAt: number } | null,
  next: { intensity: number },
  now: number,
): boolean {
  return !current || now >= current.endsAt || next.intensity > current.intensity;
}

export function createRateLimiter(minGapMs: number): (now: number) => boolean {
  let last = -Infinity;
  return (now) => {
    if (now - last < minGapMs) return false;
    last = now;
    return true;
  };
}

/** Playback rate in [1 - amount, 1 + amount). */
export const jitterRate = (rand: () => number, amount = 0.05): number =>
  1 - amount + rand() * 2 * amount;
