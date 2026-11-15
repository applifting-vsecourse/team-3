import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { AuthenticatedUserGuard } from './authenticated-user.guard';

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

describe('AuthenticatedUserGuard age confirmation', () => {
  const guard = new AuthenticatedUserGuard(mock<BetterAuth>());
  it('rejects visitors', async () => {
    getSession.mockResolvedValue(null);
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });
  it('rejects accounts that have not confirmed', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1', ageConfirmedAt: null } });
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(
      ForbiddenException,
    );
  });
  it('allows an account that confirmed', async () => {
    const session = { user: { id: 'u1', ageConfirmedAt: new Date() } };
    getSession.mockResolvedValue(session);
    const request: Record<string, unknown> = {};
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.session).toEqual(session);
  });
});
