import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { fromNodeHeaders } from 'better-auth/node';
import { Request } from 'express';

/**
 * Asks BetterAuth whether the password is the signed-in user's (its
 * server-only `verifyPassword`, which checks the session from the request's
 * cookie and the password with its own hash). False for a wrong password
 * and for an account without one; anything else (no session) is rethrown.
 */
export const verifyCurrentPassword = async (
  betterAuth: BetterAuth,
  request: Request,
  password: string,
): Promise<boolean> => {
  try {
    await betterAuth.api.verifyPassword({
      body: { password },
      headers: fromNodeHeaders(request.headers),
    });
    return true;
  } catch (error) {
    const code = (error as { body?: { code?: unknown } }).body?.code;
    if (code === 'INVALID_PASSWORD') return false;
    throw error;
  }
};

/**
 * How old a session may be for a sensitive action, in seconds: BetterAuth's
 * `session.freshAge` (24 h unless configured), the same rule its own
 * sensitive endpoints apply.
 */
export const sessionFreshAgeSeconds = async (
  betterAuth: BetterAuth,
): Promise<number> => (await betterAuth.$context).sessionConfig.freshAge;
