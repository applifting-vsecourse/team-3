import { Prisma } from '@/generated/prisma/client';
import { MyEventsTab } from '@/modules/event/domain/event';

/**
 * Prisma `where` for a tab of „Moje akce“ (B-035). A pure function so the
 * sorting into tabs can be tested without a database (CI has none).
 * - `attending`: an approved place or a request still waiting, the user's own
 *   event too when they joined it (Q12);
 * - `organizing`: the events the user created.
 * Both list upcoming events only (past ones are Proběhlé, #61), cancelled ones
 * with their label; hidden and deleted never.
 */
export const buildMyEventsWhere = (
  tab: MyEventsTab,
  userId: string,
  now: Date,
): Prisma.EventWhereInput => ({
  AND: [
    { status: { in: ['published', 'cancelled'] }, startsAt: { gt: now } },
    tab === 'attending'
      ? {
          participations: {
            some: { userId, status: { in: ['approved', 'pending'] } },
          },
        }
      : { organizerUserId: userId },
  ],
});
