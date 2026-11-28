import type { ExecutionContext } from '@nestjs/common';
import {
  INVITE_LOOKUP_IP_LIMIT,
  InviteLookupThrottlerGuard,
} from './invite-lookup-throttler.guard';

const from = (ip: string): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
  }) as unknown as ExecutionContext;

describe('InviteLookupThrottlerGuard (#406)', () => {
  it('lets 60 lookups per IP through, then 429', () => {
    const guard = new InviteLookupThrottlerGuard();
    for (let i = 0; i < INVITE_LOOKUP_IP_LIMIT; i++) {
      expect(guard.canActivate(from('1.2.3.4'))).toBe(true);
    }
    expect(() => guard.canActivate(from('1.2.3.4'))).toThrow(
      expect.objectContaining({ status: 429 }),
    );
    // another IP is counted on its own
    expect(guard.canActivate(from('5.6.7.8'))).toBe(true);
  });
});
