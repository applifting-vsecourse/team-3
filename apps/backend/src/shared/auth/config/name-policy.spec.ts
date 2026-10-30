import { rejectInvalidNames } from './name-policy';

// better-auth is ESM-only, which Jest can't load: the error is a plain class
// keeping what it was given.
jest.mock('better-auth/api', () => ({
  APIError: {
    from: (status: string, body: { code: string; message: string }): Error =>
      Object.assign(new Error(body.message), { status, body }),
  },
}));

describe('rejectInvalidNames (#153)', () => {
  it('refuses a name with < at sign-up with 400 INVALID_NAME, saying why', async () => {
    await expect(
      rejectInvalidNames({
        path: '/sign-up/email',
        body: { name: '<b>Jana</b>', email: 'jana@example.com' },
      }),
    ).rejects.toMatchObject({
      status: 'BAD_REQUEST',
      body: {
        code: 'INVALID_NAME',
        message: expect.stringMatching(/^Znak „<“ do jména nepatří/),
      },
    });
  });

  it('checks a changed name the same way', async () => {
    await expect(
      rejectInvalidNames({ path: '/update-user', body: { name: 'J' } }),
    ).rejects.toMatchObject({
      body: { code: 'INVALID_NAME', message: 'Jméno musí mít aspoň 2 znaky.' },
    });
  });

  it('lets a proper name through, and a profile change without a name', async () => {
    await expect(
      rejectInvalidNames({
        path: '/sign-up/email',
        body: { name: 'Žofie Řeháková-Štěpánková' },
      }),
    ).resolves.toBeUndefined();
    await expect(
      rejectInvalidNames({ path: '/update-user', body: { image: null } }),
    ).resolves.toBeUndefined();
  });

  it('leaves other endpoints alone', async () => {
    await expect(
      rejectInvalidNames({ path: '/sign-in/email', body: { name: '<>' } }),
    ).resolves.toBeUndefined();
  });
});
