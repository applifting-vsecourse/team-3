import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { mock, mockDeep } from 'jest-mock-extended';
import {
  EMAIL_NOT_VERIFIED,
  USER_BLOCKED,
  VerifiedUserGuard,
} from './verified-user.guard';

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

const session = { user: { id: 'u1', name: 'Jakub' } };

describe('VerifiedUserGuard', () => {
  const setup = (
    user: { emailVerified: boolean; blockedAt: Date | null } | null,
  ): VerifiedUserGuard => {
    const prisma = mockDeep<PrismaService>();
    prisma.user.findUnique.mockResolvedValue(user as never);
    return new VerifiedUserGuard(mock<BetterAuth>(), prisma);
  };

  it('lets a verified user through and puts the session on the request', async () => {
    getSession.mockResolvedValue(session);
    const request: Record<string, unknown> = {};

    await expect(
      setup({ emailVerified: true, blockedAt: null }).canActivate(
        contextFor(request),
      ),
    ).resolves.toBe(true);
    expect(request.session).toBe(session);
  });

  it('an unverified e-mail is 403 EMAIL_NOT_VERIFIED', async () => {
    getSession.mockResolvedValue(session);
    const guard = setup({ emailVerified: false, blockedAt: null });

    const error = await guard.canActivate(contextFor({})).catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ code: EMAIL_NOT_VERIFIED });
  });

  it('a blocked user is 403 USER_BLOCKED, verified or not', async () => {
    getSession.mockResolvedValue(session);
    const guard = setup({ emailVerified: true, blockedAt: new Date() });

    const error = await guard.canActivate(contextFor({})).catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ code: USER_BLOCKED });
  });

  it('no session is 401', async () => {
    getSession.mockResolvedValue(null);

    await expect(
      setup({ emailVerified: true, blockedAt: null }).canActivate(
        contextFor({}),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('a session whose user no longer exists is 401', async () => {
    getSession.mockResolvedValue(session);

    await expect(setup(null).canActivate(contextFor({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
