import type { Config } from '@/shared/config/config.service';
import { haveIBeenPwned } from 'better-auth/plugins';
import {
  breachedPasswordsPlugin,
  pwnedPasswordsCheckEnabled,
} from './breached-passwords';

// better-auth is ESM-only, which Jest can't load: the plugin is a stand-in
// with the real one's id, and what it is given is checked. No network here.
jest.mock('better-auth/plugins', () => ({
  haveIBeenPwned: jest.fn((options: unknown) => ({
    id: 'have-i-been-pwned',
    options,
  })),
}));

/** The Config the backend would build with this PWNED_PASSWORDS_CHECK. */
const configWith = (value: string | undefined): Config => {
  const before = process.env.PWNED_PASSWORDS_CHECK;
  if (value === undefined) delete process.env.PWNED_PASSWORDS_CHECK;
  else process.env.PWNED_PASSWORDS_CHECK = value;
  try {
    let config: Config | undefined;
    // @Env reads the environment when the class is defined
    jest.isolateModules(() => {
      const { Config: FreshConfig } = jest.requireActual<{
        Config: new () => Config;
      }>('@/shared/config/config.service');
      config = new FreshConfig();
    });
    if (!config) throw new Error('no config');
    return config;
  } finally {
    if (before === undefined) delete process.env.PWNED_PASSWORDS_CHECK;
    else process.env.PWNED_PASSWORDS_CHECK = before;
  }
};

describe('refusing passwords from data breaches (#153)', () => {
  it('is on in production and off in tests and development, unless PWNED_PASSWORDS_CHECK says otherwise', () => {
    expect(pwnedPasswordsCheckEnabled({ nodeEnv: 'production' })).toBe(true);
    expect(pwnedPasswordsCheckEnabled({ nodeEnv: 'test' })).toBe(false);
    expect(pwnedPasswordsCheckEnabled({ nodeEnv: 'development' })).toBe(false);
    expect(pwnedPasswordsCheckEnabled({})).toBe(false);
    // the switch for when Have I Been Pwned is down
    expect(
      pwnedPasswordsCheckEnabled({
        nodeEnv: 'production',
        pwnedPasswordsCheck: 'false',
      }),
    ).toBe(false);
    expect(
      pwnedPasswordsCheckEnabled({
        nodeEnv: 'development',
        pwnedPasswordsCheck: 'true',
      }),
    ).toBe(true);
  });

  it('an empty PWNED_PASSWORDS_CHECK (as in .env.example) leaves it to NODE_ENV', () => {
    expect(
      pwnedPasswordsCheckEnabled({
        nodeEnv: 'production',
        pwnedPasswordsCheck: '',
      }),
    ).toBe(true);
    expect(
      pwnedPasswordsCheckEnabled({ nodeEnv: 'test', pwnedPasswordsCheck: ' ' }),
    ).toBe(false);
  });

  it('the config passes the variable on as written: unset stays unset, not false', () => {
    // a boolean property would read a missing variable as false and so switch
    // the check off in production too
    expect(configWith(undefined).pwnedPasswordsCheck).toBeUndefined();
    expect(configWith('').pwnedPasswordsCheck).toBe('');
    expect(configWith('false').pwnedPasswordsCheck).toBe('false');
    expect(
      pwnedPasswordsCheckEnabled({
        nodeEnv: 'production',
        pwnedPasswordsCheck: configWith(undefined).pwnedPasswordsCheck,
      }),
    ).toBe(true);
  });

  it("is BetterAuth's Have I Been Pwned plugin, with the message in Czech", () => {
    const plugin = breachedPasswordsPlugin({ nodeEnv: 'production' });

    expect(plugin.id).toBe('have-i-been-pwned');
    expect(haveIBeenPwned).toHaveBeenLastCalledWith({
      enabled: true,
      customPasswordCompromisedMessage:
        'Tohle heslo se objevilo mezi uniklými hesly z jiných webů a útočníci ho zkoušejí jako první. Zvol prosím jiné.',
    });

    breachedPasswordsPlugin({ nodeEnv: 'test' });
    expect(haveIBeenPwned).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
