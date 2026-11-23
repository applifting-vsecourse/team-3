import { Injectable } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerRequest,
} from '@nestjs/throttler';
import { RATE_LIMITS, RateLimitName } from './rate-limits';

/**
 * A guard that applies only the named limits from rate-limits.ts, with each
 * limit's Czech message on 429. ThrottlerModule is global and holds all the
 * limits; the library's guard would apply every one of them to every route.
 */
abstract class RateLimitGuard extends ThrottlerGuard {
  protected abstract readonly limits: readonly RateLimitName[];

  async onModuleInit(): Promise<void> {
    await super.onModuleInit();
    this.throttlers = this.throttlers.filter((throttler) =>
      this.limits.includes(throttler.name as RateLimitName),
    );
  }

  protected async handleRequest(request: ThrottlerRequest): Promise<boolean> {
    try {
      return await super.handleRequest(request);
    } catch (error) {
      if (!(error instanceof ThrottlerException)) throw error;
      throw new ThrottlerException(
        RATE_LIMITS[request.throttler.name as RateLimitName].message,
      );
    }
  }
}

/**
 * Counted per signed-in user, not per IP: a whole classroom on one Wi-Fi is
 * one IP (#141). Goes after the guard that puts the session on the request;
 * without one it counts the IP rather than letting the request through.
 */
export abstract class UserRateLimitGuard extends RateLimitGuard {
  protected async getTracker(request: {
    session?: { user: { id: string } };
    ip?: string;
  }): Promise<string> {
    const userId = request.session?.user.id;
    return userId ? `user:${userId}` : `ip:${await super.getTracker(request)}`;
  }
}

/** Every write but creating events, groups and places: 120 a minute per user. */
@Injectable()
export class WriteThrottlerGuard extends UserRateLimitGuard {
  protected readonly limits = ['write'] as const;
}

/** A new event or group: 20 an hour per user, both together, and a write. */
@Injectable()
export class CreateThrottlerGuard extends UserRateLimitGuard {
  protected readonly limits = ['create', 'write'] as const;
}

/**
 * Public reads with people's names (N-10): 600 a minute. A visitor counts per
 * IP; a signed-in user per account where OptionalUserGuard has put the
 * session on the request first, so a classroom on one IP doesn't share one
 * count (an event detail asks again every 10 s while one waits, #230 review).
 * The IP is Express's `request.ip`, never a header the client sets: behind
 * the staging proxy it comes from `trust proxy` (TRUST_PROXY_HOPS).
 */
@Injectable()
export class PublicReadThrottlerGuard extends UserRateLimitGuard {
  protected readonly limits = ['publicRead'] as const;
}
