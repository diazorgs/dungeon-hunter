/** Full damage within 40 % of the radius, falling linearly to 50 % at the edge, 0 outside. */
export function explosionDamage(base: number, dist: number, radius: number): number {
  if (dist > radius) return 0;
  const inner = radius * 0.4;
  if (dist <= inner) return base;
  const t = (dist - inner) / (radius - inner);
  return Math.round(base * (1 - 0.5 * t));
}
