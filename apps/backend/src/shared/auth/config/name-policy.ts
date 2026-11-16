import { nameProblem, trimName } from '@/shared/auth/domain/name-policy';
import { APIError } from 'better-auth/api';

// The endpoints that set a name: signing up and changing the profile.
const NAME_PATHS = new Set(['/sign-up/email', '/update-user']);

/**
 * #153: BetterAuth takes any string as a name, so one with characters that
 * don't belong in a name (<, digits, emoji, control characters) or of the
 * wrong length is refused here — for the form and a direct API call alike.
 * 400 with the code `INVALID_NAME` and what's wrong in Czech. One of the
 * rules of the before-hook in better-auth.config.ts.
 */
export const rejectInvalidNames = async (ctx: {
  path: string;
  body?: unknown;
}): Promise<void> => {
  if (!NAME_PATHS.has(ctx.path)) return;
  const name: unknown = (ctx.body as Record<string, unknown> | undefined)?.name;
  // no name: a profile change without one, or BetterAuth's own validation error
  if (typeof name !== 'string') return;
  const problem = nameProblem(name);
  if (problem) {
    throw APIError.from('BAD_REQUEST', {
      code: 'INVALID_NAME',
      message: problem,
    });
  }
};

/**
 * #199: the database hook that saves a name without the spaces around it, for
 * every account BetterAuth writes — an e-mail sign-up, Google (#154) and
 * `update-user` alike. The before-hook above has checked the name already;
 * the profile (#178) saves through Prisma and trims with the same trimName.
 */
export const trimSavedName = async (user: {
  name?: unknown;
}): Promise<{ data: { name: string } } | undefined> => {
  if (typeof user.name !== 'string') return undefined;
  const name = trimName(user.name);
  return name === user.name ? undefined : { data: { name } };
};
