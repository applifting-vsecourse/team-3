import type { BetterAuthOptions } from 'better-auth/types';

/**
 * BetterAuth's rate limit, on in production: 100 requests per IP and path,
 * 3 for sign-in and sign-up. The count only resets after 10 s without a
 * request, and a whole classroom on one Wi-Fi is one IP, while the app asks
 * for the session on every page load and window focus. So the session check
 * isn't limited (it guesses nothing, and our own /api reads aren't limited
 * either); everything else keeps BetterAuth's defaults.
 */
export const rateLimitOptions = {
  customRules: { '/get-session': false },
} satisfies BetterAuthOptions['rateLimit'];
