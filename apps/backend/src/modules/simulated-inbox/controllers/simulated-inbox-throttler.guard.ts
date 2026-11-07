import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

export const SIMULATED_INBOX_LIMIT = 20;
export const SIMULATED_INBOX_WINDOW_MS = 10 * 60 * 1000;

/**
 * The simulated inbox checks a password, so it is limited like a sign-in:
 * 20 looks per address in 10 minutes, enough for opening the e-mail a few
 * times and far too few for guessing. Counted per address, not per IP: a
 * whole classroom on one Wi-Fi is one IP (see rate-limit.ts). In memory,
 * like the inbox itself. Not @nestjs/throttler: its module is global, and a
 * second `forRoot` next to the catalog's would make the options ambiguous.
 */
@Injectable()
export class SimulatedInboxThrottlerGuard implements CanActivate {
  private readonly windows = new Map<
    string,
    { startedAt: number; count: number }
  >();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      body?: { email?: unknown };
      ip?: string;
    }>();
    const email = request.body?.email;
    const key =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : (request.ip ?? 'unknown');

    const now = Date.now();
    this.forgetExpired(now);
    const window = this.windows.get(key);
    if (!window) {
      this.windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (window.count >= SIMULATED_INBOX_LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          // shown as it is under the e-mail
          message: 'Příliš mnoho pokusů. Zkus to prosím za pár minut.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    window.count++;
    return true;
  }

  private forgetExpired(now: number): void {
    for (const [key, window] of this.windows) {
      if (now - window.startedAt >= SIMULATED_INBOX_WINDOW_MS) {
        this.windows.delete(key);
      }
    }
  }
}
