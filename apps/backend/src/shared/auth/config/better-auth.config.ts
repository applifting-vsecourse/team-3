import { PASSWORD_MIN_LENGTH } from '@/shared/auth/domain/password-policy';
import { createAuthMiddleware } from 'better-auth/api';
import { username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';
import { requireConsent, stampConsent } from './consent';
import { rejectInvalidNames } from './name-policy';
import { rejectWeakPasswords } from './password-policy';

export const betterAuthCoreConfig: BetterAuthOptions = {
  // No own `password.hash`: the seed writes demo passwords with BetterAuth's
  // default one (replaceSeedPassword, N-3). Changing it means changing the seed;
  // the seed fails loudly if `verify` no longer accepts that hash.
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    // #236 (S-5, PO 4. 11.): only a verified e-mail signs in. Sign-in with an
    // unverified one is 403 EMAIL_NOT_VERIFIED without a session, and sign-up
    // makes no session either: the link from the e-mail verifies, then the
    // user signs in. So whoever is signed in is verified; VerifiedUserGuard
    // stays for sessions from before. No new link on every refused sign-in
    // (`sendOnSignIn`): the app offers „Poslat odkaz znovu“, which BetterAuth
    // rate-limits.
    requireEmailVerification: true,
  },
  // Our rules on top of BetterAuth's own checks, one file each. Every request
  // passes all of them and each acts only on the endpoints it is about, in
  // the form's order: the name (#153), the password — BetterAuth checks only
  // its length, we want a letter and a digit too (B-010) — and the consent (#153).
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      await rejectInvalidNames(ctx);
      await rejectWeakPasswords(ctx);
      await requireConsent(ctx);
    }),
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
      // #153: when the consent was given. The server sets it (stampConsent
      // below); a client sending it is refused (input: false).
      termsAcceptedAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: { create: { before: stampConsent } },
  },
  // openAPI() (/api/auth/reference) is added in better-auth.provider.ts, only
  // where the API docs are on (N-9)
  plugins: [username()],
};
