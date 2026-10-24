import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { mockDeep } from 'jest-mock-extended';
import { ensureUser } from './ensure-user';

const params = {
  email: 'Admin@HobbyHub.cz',
  password: 'adminpassword',
  name: 'Admin',
  username: 'superadmin',
  emailVerified: true,
};

describe('ensureUser', () => {
  it('finds an existing account whatever the case of the e-mail', async () => {
    const prisma = mockDeep<PrismaService>();
    const auth = mockDeep<BetterAuth>();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' } as never);

    const result = await ensureUser(prisma, auth, params);

    expect(result.created).toBe(false);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@hobbyhub.cz' },
    });
    expect(auth.api.signUpEmail).not.toHaveBeenCalled();
  });

  it('signs up with the lower-cased e-mail and finds the new account by it', async () => {
    const prisma = mockDeep<PrismaService>();
    const auth = mockDeep<BetterAuth>();
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'u1' } as never);
    prisma.user.update.mockResolvedValue({ id: 'u1' } as never);

    const result = await ensureUser(prisma, auth, params);

    expect(result.created).toBe(true);
    expect(auth.api.signUpEmail).toHaveBeenCalledWith({
      body: expect.objectContaining({ email: 'admin@hobbyhub.cz' }),
    });
    expect(prisma.user.findUnique).toHaveBeenLastCalledWith({
      where: { email: 'admin@hobbyhub.cz' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ username: 'superadmin' }),
      }),
    );
  });
});
