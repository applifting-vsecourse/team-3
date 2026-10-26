import { PASSWORD_COMPROMISED_MESSAGE } from '@/shared/auth/domain/password-policy';
import type { Config } from '@/shared/config/config.service';
import { haveIBeenPwned } from 'better-auth/plugins';

type BreachCheckEnv = Pick<Config, 'pwnedPasswordsCheck' | 'nodeEnv'>;

/**
 * #153: whether new passwords are checked against Have I Been Pwned. On in
 * production unless PWNED_PASSWORDS_CHECK says otherwise; off in tests and
 * local development, which then never go to the network for it.
 */
export const pwnedPasswordsCheckEnabled = (config: BreachCheckEnv): boolean => {
  const setting = config.pwnedPasswordsCheck?.trim().toLowerCase();
  if (setting === 'true') return true;
  if (setting === 'false') return false;
  return config.nodeEnv === 'production';
};

/**
 * #153: refuses a password that is in a known data breach — on sign-up,
 * password change and reset (NIST 800-63B-4, ASVS 6.2.12; GitHub, Clerk and
 * Stytch do the same). BetterAuth's own plugin: it runs when the password is
 * hashed, so after our rules (B-010), and sends Have I Been Pwned only the
 * first 5 characters of the password's SHA-1 (k-anonymity). A breached one
 * gets 400 `PASSWORD_COMPROMISED` with the message in Czech.
 *
 * It fails closed: while Have I Been Pwned can't be reached, setting a
 * password fails with 500. PWNED_PASSWORDS_CHECK=false turns it off.
 *
 * Not part of betterAuthCoreConfig: it has no database schema, and the
 * migration CLI shouldn't depend on the network.
 */
export const breachedPasswordsPlugin = (
  config: BreachCheckEnv,
): ReturnType<typeof haveIBeenPwned> =>
  haveIBeenPwned({
    enabled: pwnedPasswordsCheckEnabled(config),
    customPasswordCompromisedMessage: PASSWORD_COMPROMISED_MESSAGE,
  });
