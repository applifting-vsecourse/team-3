import { Prisma } from '@/generated/prisma/client';
import { buildActiveGroupsWhere } from './active-groups-where';

/**
 * Where the next event of a group is looked for: published and not started.
 * Any visibility, members-only too: a group that meets only for its members
 * still meets (PO 4. 11.). Only the order uses it, its time never leaves.
 */
export const upcomingGroupEventWhere = (now: Date): Prisma.EventWhereInput => ({
  status: 'published',
  startsAt: { gt: now },
});

/**
 * Prisma `where` for „Tyhle skupiny rozšiřují partu“ on the landing page
 * (#182, PO 4. 11.): active groups of both types (public = join at once,
 * closed = ask for membership) in the locality, with an upcoming event. A
 * signed-in viewer doesn't get groups they are already in, wait for, or are
 * blocked in. A pure function so it can be tested without a database.
 */
export const buildRecruitingGroupsWhere = (
  query: { localityId?: string; viewerId: string | null },
  now: Date,
): Prisma.GroupWhereInput => {
  const conditions: Prisma.GroupWhereInput[] = [
    buildActiveGroupsWhere({ localityId: query.localityId }),
    { events: { some: upcomingGroupEventWhere(now) } },
  ];
  if (query.viewerId) {
    conditions.push({ members: { none: { userId: query.viewerId } } });
  }
  return { AND: conditions };
};
