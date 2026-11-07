import { isIP } from 'node:net';
import {
  SIMULATED_INBOX,
  SimulatedInbox,
} from '@/core/email/simulated-inbox/simulated-inbox';
import { simulatedInboxOff } from '@/modules/simulated-inbox/services/simulated-inbox.service';
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { BoundedWindowCounter } from './bounded-window-counter';

export const SIMULATED_INBOX_WINDOW_MS = 10 * 60 * 1000;
/** Looks per address in the window: a few openings, far too few for guessing. */
export const SIMULATED_INBOX_ADDRESS_LIMIT = 20;
/** Looks per IP in the window, against trying one password on many addresses. */
export const SIMULATED_INBOX_IP_LIMIT = 100;
/** Keys each counter keeps at most; the oldest go first. */
export const SIMULATED_INBOX_MAX_KEYS = 10_000;
/** The longest e-mail address (RFC 5321), as the request DTO allows. */
export const EMAIL_MAX_LENGTH = 320;

type InboxRequest = {
  body?: { email?: unknown };
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
};

/**
 * The client IP as BetterAuth's own rate limit takes it behind the proxy:
 * `x-forwarded-for` when it holds exactly one valid address, otherwise the
 * connection's.
 */
export const clientIp = (request: InboxRequest): string => {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ips = forwarded
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (ips.length === 1 && isIP(ips[0])) return ips[0];
  }
  return request.ip ?? 'unknown';
};

/**
 * In front of the simulated inbox, which checks a password: 404 first where
 * the inbox is off (production with real e-mails), so nothing is counted
 * there; then the e-mail is checked before it becomes a key (400, nothing
 * stored); then 20 looks per address and 100 per IP in 10 minutes (429).
 * Per address rather than only per IP: a whole classroom on one Wi-Fi is one
 * IP (see rate-limit.ts). In memory and bounded, like the inbox itself. Not
 * @nestjs/throttler: its module is global, and a second `forRoot` next to the
 * catalog's would make the options ambiguous.
 */
@Injectable()
export class SimulatedInboxThrottlerGuard implements CanActivate {
  private readonly perAddress = new BoundedWindowCounter({
    limit: SIMULATED_INBOX_ADDRESS_LIMIT,
    windowMs: SIMULATED_INBOX_WINDOW_MS,
    maxKeys: SIMULATED_INBOX_MAX_KEYS,
  });
  private readonly perIp = new BoundedWindowCounter({
    limit: SIMULATED_INBOX_IP_LIMIT,
    windowMs: SIMULATED_INBOX_WINDOW_MS,
    maxKeys: SIMULATED_INBOX_MAX_KEYS,
  });

  constructor(
    @Inject(SIMULATED_INBOX) private readonly inbox: SimulatedInbox | null,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.inbox) throw simulatedInboxOff();

    const request = context.switchToHttp().getRequest<InboxRequest>();
    const email = request.body?.email;
    const address = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (address.length === 0 || address.length > EMAIL_MAX_LENGTH) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Zadej platný e-mail.',
      });
    }

    // both count, so neither limit can be dodged by the other's key
    const ipAllowed = this.perIp.hit(clientIp(request));
    const addressAllowed = this.perAddress.hit(address);
    if (!ipAllowed || !addressAllowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          // shown as it is under the e-mail
          message: 'Příliš mnoho pokusů. Zkus to prosím za pár minut.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  /** For tests: how many keys the counters hold. */
  get trackedKeys(): { addresses: number; ips: number } {
    return { addresses: this.perAddress.size, ips: this.perIp.size };
  }
}
