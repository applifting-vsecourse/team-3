import { passwordProblem } from '@/shared/auth/domain/password-policy';
import { APIError, createAuthMiddleware } from 'better-auth/api';

// The endpoints that set a password, and the field each one sends it in.
const PASSWORD_FIELDS: Record<string, string> = {
  '/sign-up/email': 'password',
  '/reset-password': 'newPassword',
  '/change-password': 'newPassword',
};

/**
 * B-010: BetterAuth checks only the length, so a weak password is refused
 * here, before the endpoint runs — for the form and a direct API call alike.
 * 400 with the code `WEAK_PASSWORD` and the rule in Czech.
 */
export const rejectWeakPasswords = createAuthMiddleware(async (ctx) => {
  const field = PASSWORD_FIELDS[ctx.path];
  if (!field) return;
  const password: unknown = (ctx.body as Record<string, unknown> | undefined)?.[
    field
  ];
  // a missing password is BetterAuth's own validation error
  if (typeof password !== 'string') return;
  const problem = passwordProblem(password);
  if (problem) {
    throw APIError.from('BAD_REQUEST', {
      code: 'WEAK_PASSWORD',
      message: problem,
    });
  }
});
