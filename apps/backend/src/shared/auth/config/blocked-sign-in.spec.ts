import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { refuseBlockedSessions } from './blocked-sign-in';

// better-auth is ESM-only, which Jest can't load: the error is a plain class
// keeping what it was given (as in consent.spec.ts).
jest.mock('better-auth/api', () => ({
  APIError: {
    from: (status: string, body: { code: string; message: string }): Error =>
      Object.assign(new Error(body.message), { status, body }),
  },
}));

describe('refuseBlockedSessions (PO 26. 11., B-063, N-7)', () => {
  const setup = (
    blockedAt: Date | null,
  ): {
    prisma: DeepMockProxy<PrismaService>;
    refuse: ReturnType<typeof refuseBlockedSessions>;
  } => {
    const prisma = mockDeep<PrismaService>();
    prisma.user.findUnique.mockResolvedValue({ blockedAt } as never);
    return { prisma, refuse: refuseBlockedSessions(prisma) };
  };

  it('a blocked account gets no new session: 403 USER_BLOCKED', async () => {
    const { prisma, refuse } = setup(new Date('2026-11-27T10:00:00Z'));

    const refused = refuse({ userId: 'u-blocked' });

    await expect(refused).rejects.toMatchObject({
      status: 'FORBIDDEN',
      body: { code: 'USER_BLOCKED' },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u-blocked' },
      select: { blockedAt: true },
    });
  });

  it('anyone else signs in as before', async () => {
    const { refuse } = setup(null);

    await expect(refuse({ userId: 'u-ok' })).resolves.toBeUndefined();
  });
});
