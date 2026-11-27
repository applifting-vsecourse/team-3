import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { mock, mockDeep } from 'jest-mock-extended';
import { AdminGuard, NOT_ADMIN } from './admin.guard';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest; the guard needs neither.
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

describe('AdminGuard (#308)', () => {
  const setup = (
    user: {
      role: 'user' | 'admin';
      blockedAt: Date | null;
      ageConfirmedAt?: Date | null;
    } | null,
  ): {
    guard: AdminGuard;
    prisma: ReturnType<typeof mockDeep<PrismaService>>;
  } => {
    const prisma = mockDeep<PrismaService>();
    // confirmed by default, as every seeded and signed-up account (#107)
    prisma.user.findUnique.mockResolvedValue(
      (user ? { ageConfirmedAt: new Date(), ...user } : null) as never,
    );
    return { guard: new AdminGuard(mock<BetterAuth>(), prisma), prisma };
  };

  it('lets the superadmin through and puts the session on the request', async () => {
    getSession.mockResolvedValue(session);
    const request: Record<string, unknown> = {};

    await expect(
      setup({ role: 'admin', blockedAt: null }).guard.canActivate(
        contextFor(request),
      ),
    ).resolves.toBe(true);
    expect(request.session).toBe(session);
  });

  it('a regular user is 403 NOT_ADMIN', async () => {
    getSession.mockResolvedValue(session);
    const { guard } = setup({ role: 'user', blockedAt: null });

    const error = await guard.canActivate(contextFor({})).catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ code: NOT_ADMIN });
  });

  it('a blocked admin is 403 too', async () => {
    getSession.mockResolvedValue(session);
    const { guard } = setup({ role: 'admin', blockedAt: new Date() });

    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('an admin who has not confirmed the age is 403 AGE_CONFIRMATION_REQUIRED, as in VerifiedUserGuard (#107)', async () => {
    getSession.mockResolvedValue(session);
    const { guard } = setup({
      role: 'admin',
      blockedAt: null,
      ageConfirmedAt: null,
    });

    const error = await guard.canActivate(contextFor({})).catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({
      code: 'AGE_CONFIRMATION_REQUIRED',
    });
  });

  it('without a session is 401, and the database is not asked', async () => {
    getSession.mockResolvedValue(null);
    const { guard, prisma } = setup({ role: 'admin', blockedAt: null });

    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('a session whose user is gone is 401', async () => {
    getSession.mockResolvedValue(session);

    await expect(
      setup(null).guard.canActivate(contextFor({})),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reads the role from the database, not from the session', async () => {
    getSession.mockResolvedValue({
      user: { ...session.user, role: 'admin' },
    } as never);
    const { guard, prisma } = setup({ role: 'user', blockedAt: null });

    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { role: true, blockedAt: true, ageConfirmedAt: true },
    });
  });
});
