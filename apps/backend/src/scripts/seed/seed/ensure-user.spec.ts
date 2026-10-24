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

// BetterAuth's ids: 32 characters of a-z, A-Z and 0-9
const NEW_ID = 'Ab3dEfGh5jKlMn7pQrSt9vWxYz1b3d5f';

type Row = {
  id: string;
  email: string;
  username: string | null;
  /** the sign-in password, standing in for its hash */
  password?: string;
};

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
    body: { email: string; password: string };
  }) => {
    rows.push({
      id: NEW_ID,
      email: body.email,
      username: null,
      password: body.password,
    });
  }) as never);
  // writes go to the rows, so a second run sees what the first one left
  prisma.user.update.mockImplementation((async ({
    where,
    data,
  }: {
    where: { id: string };
    data: Partial<Row>;
  }) => {
    const row = rows.find((r) => r.id === where.id)!;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) Object.assign(row, { [key]: value });
    }
    return row;
  }) as never);
  prisma.account.findFirst.mockImplementation((async ({
    where,
  }: {
    where: { userId: string };
  }) => {
    const row = rows.find((r) => r.id === where.userId);
    return row?.password ? { password: `hash:${row.password}` } : null;
  }) as never);
  Object.assign(auth, {
    $context: Promise.resolve({
      password: {
        verify: async ({
          hash,
          password,
        }: {
          hash: string;
          password: string;
        }) => hash === `hash:${password}`,
      },
    }),
  });
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
      where: { id: NEW_ID },
      data: expect.objectContaining({ username: 'superadmin', role: 'admin' }),
    });
  });

  it('finishes an account an earlier seed left without a username (and role)', async () => {
    // what the old lookup by the raw e-mail left behind: signed up with the
    // seed's password, never finished
    const { prisma, auth } = setup([
      {
        id: 'u1',
        email: 'admin@hobbyhub.cz',
        username: null,
        password: 'adminpassword',
      },
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

  it('keeps a derived username within the plugin rules and numbers it on a clash', async () => {
    const long = { ...params, username: 'veronika.ruzickova.dlouha' };
    const { prisma, auth } = setup([
      { id: 'a', email: 'a@x.cz', username: 'veronika.ruzickova.dlouha' },
      // the first derived name is taken too
      { id: 'b', email: 'b@x.cz', username: 'veronika.ruzickova.d.ab3def' },
    ]);

    await ensureUser(prisma, auth, long);

    const { username } = prisma.user.update.mock.calls[0]![0].data as {
      username: string;
    };
    expect(username).toBe('veronika.ruzickova.d.ab3def1');
    expect(username.length).toBeLessThanOrEqual(30);
    expect(username).toBe(username.toLowerCase());
  });

  it("treats an account whose stored hash is not a BetterAuth one as not the seed's", async () => {
    const { prisma, auth } = setup([
      { id: 'u1', email: 'admin@hobbyhub.cz', username: null, password: 'x' },
    ]);
    Object.assign(auth, {
      $context: Promise.resolve({
        password: {
          verify: async () => {
            throw new Error('Invalid password hash');
          },
        },
      }),
    });

    await expect(ensureUser(prisma, auth, params)).resolves.toMatchObject({
      created: false,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('normalises the wanted username to the plugin rules too', async () => {
    const { prisma, auth } = setup([]);

    await ensureUser(prisma, auth, {
      ...params,
      username: 'Velmi.Dlouhe.Uzivatelske.Jmeno.X',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: NEW_ID },
      data: expect.objectContaining({
        username: 'velmi.dlouhe.uzivatelske.jmeno',
      }),
    });
  });

  it("leaves alone an account without a username that isn't the seed's (different password)", async () => {
    // someone registered SUPERADMIN_EMAIL through the API, without a username
    const { prisma, auth } = setup([
      {
        id: 'u1',
        email: 'admin@hobbyhub.cz',
        username: null,
        password: 'chosen-by-someone-else',
      },
    ]);

    const result = await ensureUser(prisma, auth, params);

    expect(result.created).toBe(false);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.userInterest.createMany).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('left as it is'),
    );
  });

  it('gives a derived username when someone else holds it, so the next seed leaves the account alone', async () => {
    const { prisma, auth } = setup([
      { id: 'someone', email: 'real@person.cz', username: 'superadmin' },
    ]);

    await ensureUser(prisma, auth, params);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: NEW_ID },
      data: expect.objectContaining({
        username: 'superadmin.ab3def',
        role: 'admin',
      }),
    });

    prisma.user.update.mockClear();
    await ensureUser(prisma, auth, params);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
