import {
  googleCredentials,
  signInProviders,
  socialSignInOptions,
} from './social-sign-in';

const both = {
  googleClientId: 'id.apps.googleusercontent.com',
  googleClientSecret: 'secret',
};

describe('sign-in with Google (#154)', () => {
  it('is off without both variables, or with blank ones', () => {
    for (const config of [
      {},
      { googleClientId: both.googleClientId },
      { googleClientSecret: both.googleClientSecret },
      // .env.example leaves them empty
      { googleClientId: '', googleClientSecret: '' },
      { googleClientId: '  ', googleClientSecret: both.googleClientSecret },
    ]) {
      expect(googleCredentials(config)).toBeNull();
      expect(signInProviders(config)).toEqual({ google: false });
      // nothing for BetterAuth: no provider, and accounts are left as they were
      expect(socialSignInOptions(config)).toEqual({});
    }
  });

  it('is on with both, trimmed', () => {
    const config = {
      googleClientId: ` ${both.googleClientId}\n`,
      googleClientSecret: 'secret ',
    };

    expect(googleCredentials(config)).toEqual({
      clientId: both.googleClientId,
      clientSecret: 'secret',
    });
    expect(signInProviders(config)).toEqual({ google: true });
  });

  it('gives BetterAuth the Google client and links an account with the same e-mail', () => {
    const options = socialSignInOptions(both);

    expect(options.socialProviders?.google).toMatchObject({
      clientId: both.googleClientId,
      clientSecret: 'secret',
      prompt: 'select_account',
    });
    expect(options.account?.accountLinking).toEqual({
      enabled: true,
      trustedProviders: ['google'],
    });
    // BetterAuth's safeguard stays on: only an account with its e-mail verified is linked
    expect(options.account?.accountLinking).not.toHaveProperty(
      'requireLocalEmailVerified',
    );
  });

  it('makes the name from Google pass the name rule (#153) rather than refusing it', async () => {
    const google = socialSignInOptions(both).socialProviders?.google;
    // BetterAuth also takes a function returning the options; ours are plain
    if (!google || typeof google === 'function') throw new Error('no options');

    expect(
      await google.mapProfileToUser?.({ name: 'Jan Novák 2' } as never),
    ).toEqual({
      name: 'Jan Novák',
    });
  });
});
