import { rejectWeakPasswords } from './password-policy';

// better-auth is ESM-only, which Jest can't load: the error is a plain class
// keeping what it was given.
jest.mock('better-auth/api', () => ({
  APIError: {
    from: (status: string, body: { code: string; message: string }): Error =>
      Object.assign(new Error(body.message), { status, body }),
  },
}));

const check = rejectWeakPasswords;

describe('rejectWeakPasswords', () => {
  it('refuses a weak password at sign-up with 400 WEAK_PASSWORD', async () => {
    await expect(
      check({ path: '/sign-up/email', body: { password: 'heslo' } }),
    ).rejects.toMatchObject({
      status: 'BAD_REQUEST',
      body: { code: 'WEAK_PASSWORD' },
    });
  });

  it('checks the new password when resetting or changing it', async () => {
    for (const path of ['/reset-password', '/change-password']) {
      await expect(
        check({ path, body: { newPassword: '12345678901' } }),
      ).rejects.toMatchObject({ body: { code: 'WEAK_PASSWORD' } });
    }
  });

  it('lets a strong password through, and leaves other endpoints alone', async () => {
    await expect(
      check({ path: '/sign-up/email', body: { password: 'hobbyhub2026' } }),
    ).resolves.toBeUndefined();
    await expect(
      check({ path: '/sign-in/email', body: { password: 'x' } }),
    ).resolves.toBeUndefined();
  });
});
