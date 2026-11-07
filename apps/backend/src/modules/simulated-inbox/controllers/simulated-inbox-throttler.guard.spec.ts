import { ExecutionContext, HttpException } from '@nestjs/common';
import {
  SIMULATED_INBOX_LIMIT,
  SIMULATED_INBOX_WINDOW_MS,
  SimulatedInboxThrottlerGuard,
} from './simulated-inbox-throttler.guard';

const contextFor = (email: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ body: { email }, ip: '10.0.0.1' }),
    }),
  }) as unknown as ExecutionContext;

describe('SimulatedInboxThrottlerGuard', () => {
  afterEach(() => jest.useRealTimers());

  it('stops an address over the limit with 429 and a Czech message, others go on', () => {
    const guard = new SimulatedInboxThrottlerGuard();
    for (let i = 0; i < SIMULATED_INBOX_LIMIT; i++) {
      expect(guard.canActivate(contextFor('eva.mala@example.com'))).toBe(true);
    }

    let error: unknown;
    try {
      // the same address however it is written
      guard.canActivate(contextFor(' Eva.Mala@example.com'));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).getResponse()).toMatchObject({
      message: expect.stringMatching(/Zkus to/),
    });
    // a classroom on one IP: another address isn't held up
    expect(guard.canActivate(contextFor('jakub.kral@example.com'))).toBe(true);
  });

  it('lets the address in again once its window is over', () => {
    jest.useFakeTimers();
    const guard = new SimulatedInboxThrottlerGuard();
    for (let i = 0; i < SIMULATED_INBOX_LIMIT; i++) {
      guard.canActivate(contextFor('eva.mala@example.com'));
    }
    expect(() => guard.canActivate(contextFor('eva.mala@example.com'))).toThrow(
      HttpException,
    );

    jest.advanceTimersByTime(SIMULATED_INBOX_WINDOW_MS);

    expect(guard.canActivate(contextFor('eva.mala@example.com'))).toBe(true);
  });
});
