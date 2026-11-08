import { Injectable } from '@nestjs/common';
import { BoundedWindowCounter } from './bounded-window-counter';

export const SIMULATED_INBOX_WINDOW_MS = 10 * 60 * 1000;
/** Failed looks per address in the window: far too few for guessing. */
export const SIMULATED_INBOX_ADDRESS_LIMIT = 20;
/** Looks per IP in the window, against trying one password on many addresses. */
export const SIMULATED_INBOX_IP_LIMIT = 100;
/** Keys each counter keeps at most; a full counter refuses new ones. */
export const SIMULATED_INBOX_MAX_KEYS = 10_000;

/** The key of an address: BetterAuth keeps e-mails lower-cased. */
export const inboxAddress = (email: string): string =>
  email.trim().toLowerCase();

/**
 * The simulated inbox's limits (#236), shared by the guard, which checks them
 * before anything else, and the controller, which knows how the look ended.
 * Per IP every look counts. Per address only the failed ones (401), and a
 * successful look forgets them: the owner opening the inbox again and again
 * never locks it, a stranger guessing passwords does. Per address rather
 * than only per IP: a whole classroom on one Wi-Fi is one IP (see
 * rate-limit.ts). In memory and bounded, like the inbox itself.
 */
@Injectable()
export class SimulatedInboxLimits {
  private readonly failuresPerAddress = new BoundedWindowCounter({
    limit: SIMULATED_INBOX_ADDRESS_LIMIT,
    windowMs: SIMULATED_INBOX_WINDOW_MS,
    maxKeys: SIMULATED_INBOX_MAX_KEYS,
  });
  private readonly perIp = new BoundedWindowCounter({
    limit: SIMULATED_INBOX_IP_LIMIT,
    windowMs: SIMULATED_INBOX_WINDOW_MS,
    maxKeys: SIMULATED_INBOX_MAX_KEYS,
  });

  /** Counts a look from the IP; false once it is over its limit. */
  hitIp(ip: string): boolean {
    return this.perIp.hit(ip);
  }

  /** Too many failed looks at the address (or no room to count them). */
  isAddressLocked(address: string): boolean {
    return this.failuresPerAddress.isRefused(address);
  }

  recordFailure(address: string): void {
    this.failuresPerAddress.hit(address);
  }

  recordSuccess(address: string): void {
    this.failuresPerAddress.reset(address);
  }

  /** For tests: how many keys the counters hold. */
  get trackedKeys(): { addresses: number; ips: number } {
    return { addresses: this.failuresPerAddress.size, ips: this.perIp.size };
  }
}
