import type { Prisma } from '@/generated/prisma/client';
import { eventNotOverWhere } from '@/modules/event/domain/event-over';

/** „Kam jde“ shows the nearest few (Figma B-07f, decided 18. 11.). */
export const FRIEND_UPCOMING_TAKE = 3;

/**
 * „Kam jde“ on a friend's profile (#307): the events that aren't over yet (#272) where the
 * person has an approved place or which they organize — and only those the viewer could see
 * themselves: public ones, and members-only ones of an active group the viewer is an active
 * member of. Never a link-only (`private`) event, nor one of someone else's group. Cancelled,
 * hidden and deleted events never. Each rule is its own AND item, so none loosens another.
 */
export function friendUpcomingEventsWhere(
  personId: string,
  viewerId: string,
  now: Date,
): Prisma.EventWhereInput {
  return {
    AND: [
      { status: 'published', ...eventNotOverWhere(now) },
      {
        OR: [
          { organizerUserId: personId },
          {
            participations: { some: { userId: personId, status: 'approved' } },
          },
        ],
      },
      {
        OR: [
          { visibility: 'public' },
          {
            visibility: 'members',
            group: {
              status: 'active',
              members: { some: { userId: viewerId, status: 'active' } },
            },
          },
        ],
      },
    ],
  };
}
