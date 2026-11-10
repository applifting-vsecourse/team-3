import { betterAuthCoreConfig } from './better-auth.config';

// better-auth is ESM-only, which Jest can't load: only what the core config
// calls while it is built is replaced.
jest.mock('better-auth/api', () => ({
  APIError: class extends Error {},
  createAuthMiddleware: (handler: unknown): unknown => handler,
}));
jest.mock('better-auth/plugins', () => ({
  username: (): { id: string } => ({ id: 'username' }),
}));

// The hooks as BetterAuth calls them: the user's data and the endpoint context.
type UserHook = (
  user: Record<string, unknown>,
  ctx: { path?: string } | null,
) => Promise<{ data: Record<string, unknown> } | undefined | void>;
const hooks = betterAuthCoreConfig.databaseHooks?.user;
const create = hooks?.create?.before as unknown as UserHook;
const update = hooks?.update?.before as unknown as UserHook;

describe('the name BetterAuth saves (#199)', () => {
  it('is trimmed for an e-mail sign-up, which also gets the consent time', async () => {
    const result = await create(
      { name: '  Jana Malá  ', email: 'jana@example.com' },
      { path: '/sign-up/email' },
    );

    expect(result?.data).toEqual({
      name: 'Jana Malá',
      termsAcceptedAt: expect.any(Date),
    });
  });

  it('is trimmed for an account from Google (#154)', async () => {
    for (const path of ['/callback/:id', '/sign-in/social']) {
      const result = await create({ name: ' Jan Novák ' }, { path });
      expect(result?.data).toEqual({
        name: 'Jan Novák',
        termsAcceptedAt: expect.any(Date),
      });
    }
  });

  it('is trimmed when update-user changes it', async () => {
    await expect(
      update({ name: ' Jana Malá ' }, { path: '/update-user' }),
    ).resolves.toEqual({ data: { name: 'Jana Malá' } });
  });

  it('leaves an update without a name, or with a trimmed one, as it is', async () => {
    await expect(
      update({ image: null }, { path: '/update-user' }),
    ).resolves.toBeUndefined();
    await expect(
      update({ name: 'Jana Malá' }, { path: '/update-user' }),
    ).resolves.toBeUndefined();
  });
});
