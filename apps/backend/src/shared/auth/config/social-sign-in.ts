import { simulatedInboxEnabled } from '@/core/email/simulated-inbox/simulated-inbox-enabled';
import { toValidName } from '@/shared/auth/domain/name-policy';
import type { Config } from '@/shared/config/config.service';
import type { BetterAuthOptions } from 'better-auth/types';

type GoogleEnv = Pick<Config, 'googleClientId' | 'googleClientSecret'>;

/**
 * #154: Google's OAuth client, or null when it isn't set up. Both variables
 * are needed; one of them alone (or blank, as in .env.example) means no
 * Google — the app then offers e-mail and password and nothing breaks.
 */
export const googleCredentials = (
  config: GoogleEnv,
): { clientId: string; clientSecret: string } | null => {
  const clientId = config.googleClientId?.trim();
  const clientSecret = config.googleClientSecret?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
};

/** #154: what the sign-in page may offer besides e-mail and password. */
export type SignInProviders = { google: boolean };

export const signInProviders = (config: GoogleEnv): SignInProviders => ({
  google: googleCredentials(config) !== null,
});

/**
 * #198: where BetterAuth sends the user when the return from Google fails
 * before it has read the state — and with it the errorCallbackURL the button
 * sent (`state_not_found`, `invalid_callback_request`, a lost state cookie…).
 * Without it that is BetterAuth's English page /api/auth/error. It can't tell
 * whether the flow started at /login or /signup, so the sign-in page: it
 * shows a Czech message for BetterAuth's `?error=` (and its own /error page
 * forwards here too). Errors after the state is read go to errorCallbackURL.
 */
export const googleErrorUrl = (frontendUrl: string): string =>
  new URL('/login', frontendUrl).toString();

/**
 * #154: sign-in with Google, merged into the BetterAuth options. Built from
 * the same check as signInProviders, so the button and the server agree.
 *
 * - Google vouches for the address, so the account gets it verified, and an
 *   account with the same e-mail is linked to Google instead of a second one
 *   being made (trustedProviders). BetterAuth links only an account whose own
 *   e-mail is verified already: otherwise whoever signed up with somebody
 *   else's address (and a password they know) would get into that person's
 *   account once they sign in with Google. With the simulated inbox on, a
 *   verified e-mail proves nothing, so accounts aren't linked at all.
 * - The name from Google gets our name rule (#153) applied rather than
 *   refusing the sign-in over a digit or an emoji in it.
 * - Errors BetterAuth can't send to errorCallbackURL go to /login (#198).
 */
export const socialSignInOptions = (
  config: GoogleEnv &
    Pick<Config, 'frontendUrl'> &
    Parameters<typeof simulatedInboxEnabled>[0],
): Pick<BetterAuthOptions, 'socialProviders' | 'account' | 'onAPIError'> => {
  const google = googleCredentials(config);
  if (!google) return {};
  return {
    socialProviders: {
      google: {
        ...google,
        // with several Google accounts in the browser, ask which one
        prompt: 'select_account',
        mapProfileToUser: (profile) => ({ name: toValidName(profile.name) }),
      },
    },
    account: {
      accountLinking: {
        enabled: !simulatedInboxEnabled(config),
        trustedProviders: ['google'],
      },
    },
    onAPIError: { errorURL: googleErrorUrl(config.frontendUrl) },
  };
};
