/**
 * Counts requests per key in a fixed window, in memory and bounded: at most
 * `maxKeys` keys. A full counter refuses new keys rather than dropping a
 * running window, so flooding it with other keys can't wipe out a key's count
 * (#236 review); windows that are over are forgotten first. A Map keeps
 * insertion order and a key's window is re-inserted when it starts again, so
 * the oldest windows are always at the front: expiry looks only at the front
 * and at the key asked about, never scans everything.
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

  /** Counts a request for `key`; false (nothing counted) once it is refused. */
  hit(key: string, now = Date.now()): boolean {
    if (this.isRefused(key, now)) return false;
    const window = this.runningWindow(key, now);
    if (window) {
      window.count++;
      return true;
    }
    // a new window: to the back, as the newest
    this.windows.delete(key);
    this.windows.set(key, { startedAt: now, count: 1 });
    return true;
  }

  /**
   * Whether a request for `key` would be refused, counting nothing: the key
   * is over its limit, or it has no window and the counter is full.
   */
  isRefused(key: string, now = Date.now()): boolean {
    this.forgetExpiredFromFront(now);
    const window = this.runningWindow(key, now);
    if (window) return window.count >= this.options.limit;
    return this.windows.size >= this.options.maxKeys;
  }

  /** Forgets the key's window, e.g. after a successful attempt. */
  reset(key: string): void {
    this.windows.delete(key);
  }

  get size(): number {
    return this.windows.size;
  }

  private runningWindow(
    key: string,
    now: number,
  ): { startedAt: number; count: number } | undefined {
    const window = this.windows.get(key);
    return window && now - window.startedAt < this.options.windowMs
      ? window
      : undefined;
  }

  private forgetExpiredFromFront(now: number): void {
    for (const [key, window] of this.windows) {
      if (now - window.startedAt < this.options.windowMs) return;
      this.windows.delete(key);
    }
  }
}
