/**
 * Counts requests per key in a fixed window, in memory and bounded: at most
 * `maxKeys` keys, the oldest window goes first when a new key would exceed
 * it. A Map keeps insertion order and a key's window is re-inserted when it
 * starts again, so the oldest windows are always at the front: expiry looks
 * only at the front and at the key asked about, never scans everything.
 */
export class BoundedWindowCounter {
  private readonly windows = new Map<
    string,
    { startedAt: number; count: number }
  >();

  constructor(
    private readonly options: {
      limit: number;
      windowMs: number;
      maxKeys: number;
    },
  ) {}

  /** Counts a request for `key`; false once the key is over its limit. */
  hit(key: string, now = Date.now()): boolean {
    this.forgetExpiredFromFront(now);
    const window = this.windows.get(key);
    if (window && now - window.startedAt < this.options.windowMs) {
      if (window.count >= this.options.limit) return false;
      window.count++;
      return true;
    }
    // a new window: to the back, as the newest
    this.windows.delete(key);
    while (this.windows.size >= this.options.maxKeys) {
      const oldest = this.windows.keys().next().value;
      if (oldest === undefined) break;
      this.windows.delete(oldest);
    }
    this.windows.set(key, { startedAt: now, count: 1 });
    return true;
  }

  get size(): number {
    return this.windows.size;
  }

  private forgetExpiredFromFront(now: number): void {
    for (const [key, window] of this.windows) {
      if (now - window.startedAt < this.options.windowMs) return;
      this.windows.delete(key);
    }
  }
}
