import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import {
  BadRequestException,
  ExecutionContext,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import {
  clientIp,
  SIMULATED_INBOX_ADDRESS_LIMIT,
  SIMULATED_INBOX_IP_LIMIT,
  SIMULATED_INBOX_MAX_KEYS,
  SIMULATED_INBOX_WINDOW_MS,
  SimulatedInboxThrottlerGuard,
} from './simulated-inbox-throttler.guard';

// The service's file would load better-auth's ESM-only node entry.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const contextFor = (email: unknown, ip = '10.0.0.1'): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ body: { email }, headers: {}, ip }),
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

const guardWithInbox = (): SimulatedInboxThrottlerGuard =>
  new SimulatedInboxThrottlerGuard(new SimulatedInbox('Ověř si e-mail'));

describe('SimulatedInboxThrottlerGuard', () => {
  afterEach(() => jest.useRealTimers());

  it('is 404 where the inbox is off, before counting anything', () => {
    const guard = new SimulatedInboxThrottlerGuard(null);

    expect(
      thrown(() => guard.canActivate(contextFor('eva@example.com'))),
    ).toBeInstanceOf(NotFoundException);
    expect(guard.trackedKeys).toEqual({ addresses: 0, ips: 0 });
  });

  it.each([
    ['too long', `${'a'.repeat(400)}@example.com`],
    ['blank', '   '],
    ['not text', { a: 1 }],
  ])('a %s e-mail is 400 and stores nothing', (_, email) => {
    const guard = guardWithInbox();

    expect(thrown(() => guard.canActivate(contextFor(email)))).toBeInstanceOf(
      BadRequestException,
    );
    expect(guard.trackedKeys).toEqual({ addresses: 0, ips: 0 });
  });

  it('stops an address over its limit with 429 and a Czech message, others go on', () => {
    const guard = guardWithInbox();
    for (let i = 0; i < SIMULATED_INBOX_ADDRESS_LIMIT; i++) {
      expect(
        guard.canActivate(contextFor('eva.mala@example.com', `10.0.1.${i}`)),
      ).toBe(true);
    }

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

  it('stops one IP trying many addresses', () => {
    const guard = guardWithInbox();
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

  it('keeps no more keys than its cap', () => {
    const guard = guardWithInbox();
    for (let i = 0; i < SIMULATED_INBOX_MAX_KEYS + 50; i++) {
      guard.canActivate(
        contextFor(
          `user${i}@example.com`,
          `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`,
        ),
      );
    }

    expect(guard.trackedKeys.addresses).toBe(SIMULATED_INBOX_MAX_KEYS);
    expect(guard.trackedKeys.ips).toBe(SIMULATED_INBOX_MAX_KEYS);
  });

  it('lets the address in again once its window is over', () => {
    jest.useFakeTimers();
    const guard = guardWithInbox();
    for (let i = 0; i < SIMULATED_INBOX_ADDRESS_LIMIT; i++) {
      guard.canActivate(contextFor('eva.mala@example.com'));
    }
    expect(() => guard.canActivate(contextFor('eva.mala@example.com'))).toThrow(
      HttpException,
    );

    jest.advanceTimersByTime(SIMULATED_INBOX_WINDOW_MS);

    expect(guard.canActivate(contextFor('eva.mala@example.com'))).toBe(true);
  });
});

describe('clientIp', () => {
  it('takes a single x-forwarded-for address, as BetterAuth does', () => {
    expect(
      clientIp({
        headers: { 'x-forwarded-for': '203.0.113.7' },
        ip: '10.0.0.2',
      }),
    ).toBe('203.0.113.7');
  });

  it('falls back to the connection for a chain or garbage', () => {
    expect(
      clientIp({
        headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.7' },
        ip: '10.0.0.2',
      }),
    ).toBe('10.0.0.2');
    expect(
      clientIp({ headers: { 'x-forwarded-for': 'nope' }, ip: '10.0.0.2' }),
    ).toBe('10.0.0.2');
  });
});
