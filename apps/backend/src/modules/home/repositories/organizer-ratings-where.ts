import { Prisma } from '@/generated/prisma/client';

/**
 * Prisma `where` for the organizer ratings behind „Od dobře hodnocených
 * organizátorů“ (#182): what participants gave the organizers in `userIds`
 * at their own events and the groups in `groupIds` at the group's events
 * (a group's event counts to the group, #180). Ratings a superadmin deleted
 * and ratings of events a superadmin hid or deleted don't count
 * (docs/ux-audit.md › Úvodní stránka). A pure function, tested without a
 * database.
 */
export const buildOrganizerRatingsWhere = (owners: {
  userIds: string[];
  groupIds: string[];
}): Prisma.RatingWhereInput => ({
  deletedAt: null,
  event: {
    status: { notIn: ['hidden', 'deleted'] },
    OR: [
      { groupId: null, organizerUserId: { in: owners.userIds } },
      { groupId: { in: owners.groupIds } },
    ],
  },
});
