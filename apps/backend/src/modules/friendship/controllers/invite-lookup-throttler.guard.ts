import { BoundedWindowCounter } from '@/modules/simulated-inbox/controllers/bounded-window-counter';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

export const INVITE_LOOKUP_WINDOW_MS = 10 * 60 * 1000;
/**
 * Lookups of an invite code per IP in the window: a whole classroom on one Wi-Fi opening
 * friends' links stays far under it, guessing 128-bit codes gets nowhere anyway.
 */
export const INVITE_LOOKUP_IP_LIMIT = 60;
const INVITE_LOOKUP_MAX_KEYS = 10_000;

/**
 * In front of the public GET /api/invites/:code (#406): 60 lookups per IP in 10 minutes, then
 * 429. Defence in depth against enumeration (OWASP Authentication Cheat Sheet), on top of the
 * unguessable code and one 404 for every miss. The IP is Express's `request.ip` (`trust
 * proxy`), never a header the client sets. Not @nestjs/throttler: its module is global and the
 * catalog's `forRoot` owns its options (see the simulated inbox's guard); in memory and
 * bounded like that one (`BoundedWindowCounter`).
 */
@Injectable()
export class InviteLookupThrottlerGuard implements CanActivate {
  private readonly perIp = new BoundedWindowCounter({
    limit: INVITE_LOOKUP_IP_LIMIT,
    windowMs: INVITE_LOOKUP_WINDOW_MS,
    maxKeys: INVITE_LOOKUP_MAX_KEYS,
  });

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip?: string }>();
    if (this.perIp.hit(request.ip ?? 'unknown')) return true;
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Příliš mnoho pokusů. Zkus to prosím za pár minut.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
