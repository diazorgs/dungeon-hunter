export class Cooldown {
  private startedAt = -Infinity;
  private durationMs: number;

  constructor(durationMs: number) {
    this.durationMs = durationMs;
  }

  ready(now: number): boolean {
    return now >= this.startedAt + this.durationMs;
  }

  /** Starts the cooldown if ready; returns whether it fired. */
  trigger(now: number): boolean {
    if (!this.ready(now)) return false;
    this.startedAt = now;
    return true;
  }

  remaining(now: number): number {
    return Math.max(0, this.startedAt + this.durationMs - now);
  }

  /** 0 just triggered → 1 ready. */
  progress(now: number): number {
    return this.durationMs <= 0 ? 1 : 1 - this.remaining(now) / this.durationMs;
  }

  setDuration(ms: number): void {
    this.durationMs = ms;
  }

  reset(): void {
    this.startedAt = -Infinity;
  }
}

/** Charges that recharge one at a time (dash). */
export class ChargePool {
  // Time at which every charge is back; charges recharge sequentially toward it.
  private fullAt = -Infinity;
  private maxCharges: number;
  private readonly rechargeMs: number;

  constructor(maxCharges: number, rechargeMs: number) {
    this.maxCharges = maxCharges;
    this.rechargeMs = rechargeMs;
  }

  charges(now: number): number {
    const missing = Math.ceil(Math.max(0, this.fullAt - now) / this.rechargeMs);
    return Math.max(0, this.maxCharges - missing);
  }

  use(now: number): boolean {
    if (this.charges(now) < 1) return false;
    this.fullAt = Math.max(this.fullAt, now) + this.rechargeMs;
    return true;
  }

  setMax(n: number): void {
    this.maxCharges = n;
  }
}
