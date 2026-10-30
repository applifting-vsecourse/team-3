import { consentProblem } from '@/shared/auth/domain/consent';
import { APIError } from 'better-auth/api';

// The e-mail sign-up sends the consent in its body: the before-hook below
// refuses one without it.
const CONSENT_IN_BODY = new Set(['/sign-up/email']);

// Every sign-up asks for the consent, so an account made by any of them gets
// its time. Signing up with Google (#154) can't send it: the sign-in page says
// that continuing with Google means agreeing, and the account is made when
// Google sends the user back (/callback/:id), or straight from a Google ID
// token (/sign-in/social).
const SIGN_UPS = new Set([
  ...CONSENT_IN_BODY,
  '/callback/:id',
  '/sign-in/social',
]);

/**
 * #153: a sign-up without the terms accepted and the privacy notice
 * acknowledged (`termsAccepted`, `privacyAcknowledged` in the body) is
 * refused — for the form and a direct API call alike. 400 with the code
 * `CONSENT_REQUIRED`. BetterAuth itself ignores body fields it doesn't know,
 * so nothing else would stop it. One of the rules of the before-hook in
 * better-auth.config.ts.
 */
export const requireConsent = async (ctx: {
  path: string;
  body?: unknown;
}): Promise<void> => {
  if (!CONSENT_IN_BODY.has(ctx.path)) return;
  const problem = consentProblem(
    (ctx.body as Record<string, unknown> | undefined) ?? {},
  );
  if (problem) {
    throw APIError.from('BAD_REQUEST', {
      code: 'CONSENT_REQUIRED',
      message: problem,
    });
  }
};

/**
 * #153: the database hook that writes when the consent was given. The time is
 * the server's: `termsAcceptedAt` is a field the client can't send
 * (`input: false`, BetterAuth refuses it), and it is set only for an account
 * from a sign-up that asked for the consent — by e-mail or with Google (#154).
 */
export const stampConsent = async (
  _user: unknown,
  ctx: { path?: string } | null,
): Promise<{ data: { termsAcceptedAt: Date } } | undefined> =>
  ctx?.path && SIGN_UPS.has(ctx.path)
    ? { data: { termsAcceptedAt: new Date() } }
    : undefined;
