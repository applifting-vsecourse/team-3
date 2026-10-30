import { CONSENT_RULE, SIGN_UP_CONSENT } from '@/shared/auth/domain/consent';
import { requireConsent, stampConsent } from './consent';

// better-auth is ESM-only, which Jest can't load: the error is a plain class
// keeping what it was given.
jest.mock('better-auth/api', () => ({
  APIError: {
    from: (status: string, body: { code: string; message: string }): Error =>
      Object.assign(new Error(body.message), { status, body }),
  },
}));

const signUp = {
  name: 'Jana Malá',
  email: 'jana@example.com',
  password: 'hobbyhub2026',
};

describe('requireConsent (#153)', () => {
  it('refuses a sign-up without the consent with 400 CONSENT_REQUIRED', async () => {
    for (const body of [
      signUp,
      { ...signUp, termsAccepted: true },
      { ...signUp, termsAccepted: true, privacyAcknowledged: false },
    ]) {
      await expect(
        requireConsent({ path: '/sign-up/email', body }),
      ).rejects.toMatchObject({
        status: 'BAD_REQUEST',
        body: { code: 'CONSENT_REQUIRED', message: CONSENT_RULE },
      });
    }
  });

  it('lets a sign-up with both consents through', async () => {
    await expect(
      requireConsent({
        path: '/sign-up/email',
        body: { ...signUp, ...SIGN_UP_CONSENT },
      }),
    ).resolves.toBeUndefined();
  });

  it('leaves other endpoints alone', async () => {
    await expect(
      requireConsent({ path: '/sign-in/email', body: {} }),
    ).resolves.toBeUndefined();
    await expect(
      requireConsent({ path: '/update-user', body: { name: 'Jana' } }),
    ).resolves.toBeUndefined();
  });
});

describe('stampConsent (#153)', () => {
  it('writes the server time to an account from an e-mail sign-up', async () => {
    const before = Date.now();

    const result = await stampConsent({}, { path: '/sign-up/email' });

    const stamped = result?.data.termsAcceptedAt;
    expect(stamped).toBeInstanceOf(Date);
    expect(stamped!.getTime()).toBeGreaterThanOrEqual(before);
    expect(stamped!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('writes it for an account from a sign-up with Google too (#154)', async () => {
    for (const path of ['/callback/:id', '/sign-in/social']) {
      const result = await stampConsent({}, { path });
      expect(result?.data.termsAcceptedAt).toBeInstanceOf(Date);
    }
  });

  it('writes nothing for an account created any other way', async () => {
    await expect(
      stampConsent({}, { path: '/some-other-endpoint' }),
    ).resolves.toBeUndefined();
    // outside an endpoint, e.g. straight through the adapter
    await expect(stampConsent({}, null)).resolves.toBeUndefined();
  });
});
