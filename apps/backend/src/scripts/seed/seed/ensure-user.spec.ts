import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ensureUser } from './ensure-user';

const params = {
  email: ' Admin@HobbyHub.cz ',
  password: 'adminpassword',
  name: 'Admin',
  username: 'superadmin',
  role: 'admin' as const,
  emailVerified: true,
};

type Row = { id: string; email: string; username: string | null };

/** A user table: rows found by e-mail or by username, like findUnique. */
const setup = (
  rows: Row[],
): {
  prisma: DeepMockProxy<PrismaService>;
  auth: DeepMockProxy<BetterAuth>;
} => {
  const prisma = mockDeep<PrismaService>();
  const auth = mockDeep<BetterAuth>();
  prisma.user.findUnique.mockImplementation((({
    where,
  }: {
    where: { email?: string; username?: string };
  }) =>
    Promise.resolve(
      rows.find((row) =>
        where.email !== undefined
          ? row.email === where.email
          : row.username === where.username,
      ) ?? null,
    )) as never);
  auth.api.signUpEmail.mockImplementation((async ({
    body,
  }: {
    body: { email: string };
  }) => {
    rows.push({ id: 'new', email: body.email, username: null });
  }) as never);
  prisma.user.update.mockImplementation((async ({
    where,
  }: {
    where: { id: string };
  }) => rows.find((row) => row.id === where.id)) as never);
  return { prisma, auth };
};

describe('ensureUser', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('leaves a finished account alone, whatever the case of the e-mail', async () => {
    const { prisma, auth } = setup([
      { id: 'u1', email: 'admin@hobbyhub.cz', username: 'superadmin' },
    ]);

    const result = await ensureUser(prisma, auth, params);

    expect(result.created).toBe(false);
    expect(auth.api.signUpEmail).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.userInterest.createMany).not.toHaveBeenCalled();
  });

  it('signs up with the trimmed, lower-cased e-mail and finishes the profile', async () => {
    const { prisma, auth } = setup([]);

    const result = await ensureUser(prisma, auth, params);

    expect(result.created).toBe(true);
    expect(auth.api.signUpEmail).toHaveBeenCalledWith({
      body: expect.objectContaining({ email: 'admin@hobbyhub.cz' }),
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'new' },
      data: expect.objectContaining({ username: 'superadmin', role: 'admin' }),
    });
  });

  it('finishes an account an earlier seed left without a username (and role)', async () => {
    // what the old lookup by the raw e-mail left behind: signed up, never finished
    const { prisma, auth } = setup([
      { id: 'u1', email: 'admin@hobbyhub.cz', username: null },
    ]);

    const result = await ensureUser(prisma, auth, params);

    expect(result.created).toBe(false);
    expect(auth.api.signUpEmail).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        username: 'superadmin',
        role: 'admin',
        emailVerified: true,
      }),
    });
  });

  it('seeds the account without the username when someone else holds it', async () => {
    const { prisma, auth } = setup([
      { id: 'someone', email: 'real@person.cz', username: 'superadmin' },
    ]);

    await ensureUser(prisma, auth, params);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'new' },
      data: expect.objectContaining({ username: undefined, role: 'admin' }),
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Username superadmin is taken'),
    );
  });
});
