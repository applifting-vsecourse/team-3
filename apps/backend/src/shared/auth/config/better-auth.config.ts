import { PASSWORD_MIN_LENGTH } from '@/shared/auth/domain/password-policy';
import { createAuthMiddleware } from 'better-auth/api';
import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';
import { requireConsent, stampConsent } from './consent';
import { rejectInvalidNames } from './name-policy';
import { rejectWeakPasswords } from './password-policy';

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
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
  plugins: [openAPI(), username()],
};
