import { Prisma } from '@/generated/prisma/client';
import { GroupEventsWhen } from '@/modules/event/domain/event';
import {
  eventNotOverWhere,
  eventOverWhere,
} from '@/modules/event/domain/event-over';

/**
 * Prisma `where` for the events on a group's page (B-055, Figma A-08e). A
 * pure function so who sees what can be tested without a database (CI has
 * none).
 * - `past` (Proběhlé): published events that are over (`eventOverWhere`,
 *   #272); `upcoming`: the rest, also an event going on right now, so every
 *   event is in one of the two. Cancelled ones aren't listed: they don't take
 *   place, and a deactivated group's would fill the page.
 * - Members-only events only for an active member or admin of the group.
 */
export const buildGroupEventsWhere = (
  groupId: string,
  when: GroupEventsWhen,
  { includeMembersOnly }: { includeMembersOnly: boolean },
  now: Date,
): Prisma.EventWhereInput => ({
  AND: [
    { groupId, status: 'published' },
    when === 'upcoming' ? eventNotOverWhere(now) : eventOverWhere(now),
    // an allowlist, as in buildPublicEventsWhere: a visibility nobody allowed
    // here (`private`) never shows on the public page of a group
    includeMembersOnly
      ? { visibility: { in: ['public', 'members'] } }
      : { visibility: 'public' },
  ],
});
