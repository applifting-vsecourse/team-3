import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';

const HOUR_MS = 60 * 60 * 1000;

export const LOCALITY_THROTTLER_OPTIONS: ThrottlerModuleOptions = {
  throttlers: [{ ttl: HOUR_MS, limit: 20 }],
  // shown as it is in the locality picker
  errorMessage: 'Nových míst je teď moc. Zkus to znovu za chvíli.',
};

/**
 * Places a user can add to the public catalog per hour. Counted per user, not
 * per IP: a whole classroom on one Wi-Fi is one IP (see rate-limit.ts). Goes
 * after the guard that puts the session on the request.
 */
@Injectable()
export class LocalityThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: {
    session: { user: { id: string } };
  }): Promise<string> {
    return request.session.user.id;
  }
}
