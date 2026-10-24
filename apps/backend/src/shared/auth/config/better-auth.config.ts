import { PASSWORD_MIN_LENGTH } from '@/shared/auth/domain/password-policy';
import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';
import { rejectWeakPasswords } from './password-policy';

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
  },
  // a letter and a digit too (B-010); BetterAuth checks only the length
  hooks: { before: rejectWeakPasswords },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
    },
  },
  plugins: [openAPI(), username()],
};
