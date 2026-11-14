import { Prisma } from '@/generated/prisma/client';
import { MyEventsTab } from '@/modules/event/domain/event';
import { eventNotOverWhere } from '@/modules/event/domain/event-over';

/**
 * Prisma `where` for a tab of „Moje akce“ (B-035). A pure function so the
 * sorting into tabs can be tested without a database (CI has none).
 * - `attending`: an approved place or a request still waiting, the user's own
 *   event too when they joined it (Q12);
 * - `organizing`: the events the user created and the events of the groups
 *   they are an active admin of (B-055), as they manage those too.
 * Both list the events that are not over yet (#272), also one going on right
 * now: joining or leaving it is no longer possible (EVENT_STARTED), but it is
 * still where the user goes; past ones are Proběhlé in the profile. Cancelled
 * ones with their label; hidden and deleted never.
 */
export const buildMyEventsWhere = (
  tab: MyEventsTab,
  userId: string,
  now: Date,
): Prisma.EventWhereInput => ({
  AND: [
    { status: { in: ['published', 'cancelled'] }, ...eventNotOverWhere(now) },
    tab === 'attending'
      ? {
          participations: {
            some: { userId, status: { in: ['approved', 'pending'] } },
          },
        }
      : {
          OR: [
            { organizerUserId: userId },
            {
              group: {
                members: {
                  some: { userId, role: 'admin', status: 'active' },
                },
              },
            },
          ],
        },
  ],
});
