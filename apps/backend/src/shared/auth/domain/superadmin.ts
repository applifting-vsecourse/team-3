/** What decides whether a user acts as the superadmin, read from the database. */
export const SUPERADMIN_ACCOUNT_SELECT = {
  role: true,
  blockedAt: true,
  ageConfirmedAt: true,
} as const;

export type SuperadminAccount = {
  role: string;
  blockedAt: Date | null;
  ageConfirmedAt: Date | null;
};

/** Why the user does not act as the superadmin; the API's 403 codes. */
export type SuperadminRefusal = 'NOT_ADMIN' | 'AGE_CONFIRMATION_REQUIRED';

/**
 * The one rule for the superadmin (#308, review #380): `role = admin`, not
 * blocked, and, like every signed-in action since #107, with the age
 * confirmed. `AdminGuard` answers `/api/admin/*` by it, and the event detail
 * shows a deactivated event and `canModerate` by it, so a blocked admin
 * neither calls the admin API nor sees what only the superadmin sees.
 */
export function superadminRefusal(
  user: SuperadminAccount,
): SuperadminRefusal | null {
  if (user.role !== 'admin' || user.blockedAt) return 'NOT_ADMIN';
  if (!user.ageConfirmedAt) return 'AGE_CONFIRMATION_REQUIRED';
  return null;
}

/** Whether the user acts as the superadmin now; false without a user. */
export const isSuperadmin = (user: SuperadminAccount | null): boolean =>
  user !== null && superadminRefusal(user) === null;
