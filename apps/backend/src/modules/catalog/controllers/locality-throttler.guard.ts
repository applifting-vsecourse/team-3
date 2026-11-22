import { UserRateLimitGuard } from '@/shared/rate-limit/rate-limit.guards';
import { Injectable } from '@nestjs/common';

/**
 * Places a user can add to the public catalog: 20 an hour, and a write
 * (shared/rate-limit/rate-limits.ts). Goes after the guard that puts the
 * session on the request.
 */
@Injectable()
export class LocalityThrottlerGuard extends UserRateLimitGuard {
  protected readonly limits = ['locality', 'write'] as const;
}
