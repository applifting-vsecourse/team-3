import { Prisma } from '@/generated/prisma/client';
import { MyEventsTab } from '@/modules/event/domain/event';
import { NO_NEW_REQUEST_STATUSES } from '@/modules/event/domain/participation';

/**
 * Prisma `where` for a tab of „Moje akce“ (B-035). A pure function so the
 * sorting into tabs can be tested without a database (CI has none).
 * - `attending`: an approved place or a request still waiting, the user's own
 *   event too when they joined it (Q12);
 * - `organizing`: the events the user created and the events of the groups
 *   they are an active admin of (B-055), as they manage those too;
 * - `groups` (Z mých skupin, #304): published events of the active groups the
 *   user is an active member of (not an admin: those are in `organizing`),
 *   open to them (public or members-only, not link-only), that they can still
 *   ask to join: no place, no waiting request, and not rejected or removed by
 *   the organizer (`NO_NEW_REQUEST_STATUSES`, as the lists of #182).
 * All list upcoming events only (past ones are Proběhlé, #61); `attending` and
 * `organizing` keep cancelled ones with their label, `groups` doesn't (there is
 * nothing to go to); hidden and deleted never.
 */
export const buildMyEventsWhere = (
  tab: MyEventsTab,
  userId: string,
  now: Date,
): Prisma.EventWhereInput => {
  if (tab === 'groups') {
    return {
      AND: [
        { status: 'published', startsAt: { gt: now } },
        { visibility: { in: ['public', 'members'] } },
        {
          group: {
            status: 'active',
            members: {
              some: { userId, role: 'member', status: 'active' },
            },
          },
        },
        {
          // the page says „přihlásíš se na detailu akce“: only what decideJoin would take
          participations: {
            none: { userId, status: { in: NO_NEW_REQUEST_STATUSES } },
          },
        },
      ],
    };
  }
  return {
    AND: [
      { status: { in: ['published', 'cancelled'] }, startsAt: { gt: now } },
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
  };
};
