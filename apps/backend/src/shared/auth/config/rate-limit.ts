import type { BetterAuthOptions } from 'better-auth/types';

/**
 * BetterAuth's rate limit, on in production: 100 requests per IP and path,
 * 3 for sign-in and sign-up. The count only resets 10 s after the last allowed
 * request, and a whole classroom on one Wi-Fi is one IP, while the app asks
 * for the session on every page load (and on window focus or navigation once
 * the session is 30 s old). So the session check isn't limited: it only reads
 * the signed cookie, there is nothing to guess, and our own /api reads aren't
 * limited either. Everything else keeps BetterAuth's defaults.
 */
export const rateLimitOptions = {
  customRules: { '/get-session': false },
} satisfies BetterAuthOptions['rateLimit'];
