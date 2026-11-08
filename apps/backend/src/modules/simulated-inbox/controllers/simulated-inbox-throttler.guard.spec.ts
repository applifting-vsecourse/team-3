import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import {
  ExecutionContext,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import {
  SIMULATED_INBOX_ADDRESS_LIMIT,
  SIMULATED_INBOX_IP_LIMIT,
  SIMULATED_INBOX_WINDOW_MS,
  SimulatedInboxLimits,
} from './simulated-inbox-limits';
import { SimulatedInboxThrottlerGuard } from './simulated-inbox-throttler.guard';

// The service's file would load better-auth's ESM-only node entry.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const contextFor = (
  email: unknown,
  ip = '10.0.0.1',
  headers: Record<string, string> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ body: { email }, headers, ip }),
    }),
  }) as unknown as ExecutionContext;

const thrown = (run: () => unknown): unknown => {
  try {
    run();
  } catch (e) {
    return e;
  }
  return undefined;
};

const setUp = (): {
  guard: SimulatedInboxThrottlerGuard;
  limits: SimulatedInboxLimits;
} => {
  const limits = new SimulatedInboxLimits();
  return {
    guard: new SimulatedInboxThrottlerGuard(
      new SimulatedInbox('Ověř si e-mail'),
      limits,
    ),
    limits,
  };
};

const failTimes = (
  limits: SimulatedInboxLimits,
  address: string,
  n: number,
) => {
  for (let i = 0; i < n; i++) limits.recordFailure(address);
};

describe('SimulatedInboxThrottlerGuard', () => {
  afterEach(() => jest.useRealTimers());

  it('is 404 where the inbox is off, before counting anything', () => {
    const limits = new SimulatedInboxLimits();
    const guard = new SimulatedInboxThrottlerGuard(null, limits);

    expect(
      thrown(() => guard.canActivate(contextFor('eva@example.com'))),
    ).toBeInstanceOf(NotFoundException);
    expect(limits.trackedKeys).toEqual({ addresses: 0, ips: 0 });
  });

  it.each([
    ['too long', `${'a'.repeat(400)}@example.com`],
    ['blank', '   '],
    ['not text', { a: 1 }],
  ])('a %s e-mail is left to the DTO and stores no address', (_, email) => {
    const { guard, limits } = setUp();

    expect(guard.canActivate(contextFor(email))).toBe(true);
    expect(limits.trackedKeys.addresses).toBe(0);
  });

  it('stops an address with too many failed looks with 429 and a Czech message, others go on', () => {
    const { guard, limits } = setUp();
    failTimes(limits, 'eva.mala@example.com', SIMULATED_INBOX_ADDRESS_LIMIT);

    // the same address however it is written, from yet another IP
    const error = thrown(() =>
      guard.canActivate(contextFor(' Eva.Mala@example.com', '10.0.2.1')),
    );
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).getResponse()).toMatchObject({
      message: expect.stringMatching(/Zkus to/),
    });
    expect(guard.canActivate(contextFor('jakub.kral@example.com'))).toBe(true);
  });

  it('never locks the owner out by successful looks, and a success clears the failures', () => {
    const { guard, limits } = setUp();
    for (let i = 0; i < SIMULATED_INBOX_ADDRESS_LIMIT * 2; i++) {
      expect(
        guard.canActivate(contextFor('eva.mala@example.com', `10.0.1.${i}`)),
      ).toBe(true);
      limits.recordSuccess('eva.mala@example.com');
    }

    failTimes(
      limits,
      'eva.mala@example.com',
      SIMULATED_INBOX_ADDRESS_LIMIT - 1,
    );
    limits.recordSuccess('eva.mala@example.com');
    failTimes(
      limits,
      'eva.mala@example.com',
      SIMULATED_INBOX_ADDRESS_LIMIT - 1,
    );

    expect(guard.canActivate(contextFor('eva.mala@example.com'))).toBe(true);
  });

  it('stops one IP trying many addresses', () => {
    const { guard } = setUp();
    for (let i = 0; i < SIMULATED_INBOX_IP_LIMIT; i++) {
      guard.canActivate(contextFor(`user${i}@example.com`));
    }

    const error = thrown(() =>
      guard.canActivate(contextFor('another@example.com')),
    );
    expect((error as HttpException).getStatus()).toBe(429);
    expect(
      guard.canActivate(contextFor('another@example.com', '10.9.9.9')),
    ).toBe(true);
  });

  it('takes the IP from the connection, never from x-forwarded-for', () => {
    const { guard } = setUp();
    for (let i = 0; i < SIMULATED_INBOX_IP_LIMIT; i++) {
      guard.canActivate(
        contextFor('eva@example.com', '10.0.0.1', {
          'x-forwarded-for': `203.0.113.${i}`,
        }),
      );
    }

    const error = thrown(() =>
      guard.canActivate(
        contextFor('eva@example.com', '10.0.0.1', {
          'x-forwarded-for': '198.51.100.1',
        }),
      ),
    );
    expect((error as HttpException).getStatus()).toBe(429);
  });

  it('lets the address in again once its window is over', () => {
    jest.useFakeTimers();
    const { guard, limits } = setUp();
    failTimes(limits, 'eva.mala@example.com', SIMULATED_INBOX_ADDRESS_LIMIT);
    expect(() => guard.canActivate(contextFor('eva.mala@example.com'))).toThrow(
      HttpException,
    );

    jest.advanceTimersByTime(SIMULATED_INBOX_WINDOW_MS);

    expect(guard.canActivate(contextFor('eva.mala@example.com'))).toBe(true);
  });
});
