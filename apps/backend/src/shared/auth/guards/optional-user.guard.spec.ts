import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import { ExecutionContext } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { OptionalUserGuard } from './optional-user.guard';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest; the guard needs neither here.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const getSession = jest.mocked(getSessionFromRequest);

const contextFor = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('OptionalUserGuard', () => {
  const guard = new OptionalUserGuard(mock<BetterAuth>());

  it('lets a visitor through with no session', async () => {
    getSession.mockResolvedValue(null);
    const request: Record<string, unknown> = {};

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.session).toBeNull();
  });

  it('puts the session of a signed-in user on the request', async () => {
    const session = { user: { id: 'u1', name: 'Petra' } };
    getSession.mockResolvedValue(session);
    const request: Record<string, unknown> = {};

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.session).toBe(session);
  });

  it('serves a visitor when the session lookup fails, instead of failing the request', async () => {
    getSession.mockRejectedValue(new Error('database unreachable'));
    const request: Record<string, unknown> = {};

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.session).toBeNull();
  });
});
