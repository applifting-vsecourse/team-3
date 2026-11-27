import { PrismaService } from '@/core/prisma/prisma.service';
import { APIError } from 'better-auth/api';

/** What a blocked account hears when it tries to sign in (PO 26. 11., B-063). */
export const USER_BLOCKED_MESSAGE =
  'Tvůj účet je zablokovaný. Jestli jde o omyl, napiš nám.';

/**
 * PO 26. 11. (B-063: „zablokovat uživatele → nepřihlásí se“, audit N-7): blocking ends the
 * user's sessions (UserModerationRepository), and this refuses every new one — e-mail and
 * password, user name, Google, the link from the verification e-mail — since each of them
 * ends in a new session. 403 USER_BLOCKED, as the API answers the old sessions
 * (VerifiedUserGuard). Unblocked, the next sign-in goes through.
 */
export const refuseBlockedSessions =
  (prisma: Pick<PrismaService, 'user'>) =>
  async (session: { userId: string }): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { blockedAt: true },
    });
    if (user?.blockedAt) {
      throw APIError.from('FORBIDDEN', {
        code: 'USER_BLOCKED',
        message: USER_BLOCKED_MESSAGE,
      });
    }
  };
