import { Prisma } from '@/generated/prisma/client';

/** A place or a request still waiting: what a former member gives up (#266). */
const HELD_STATUSES = ['approved', 'pending'] as const;

/** Where someone can leave the event themselves, so the organizer hears of it. */
const LEAVABLE_STATUSES = new Set<string>(['published', 'cancelled']);

/**
 * Prisma `where` for the events of a group a former member can no longer
 * hold a place at (#266, variant A): members-only, not started yet, not
 * their own – an organizer still sees and runs their event (#62, #100). Any
 * status: a cancelled one would otherwise stay in Moje akce › Přihlášen,
 * where they can't open it. Public events and past ones (their history and
 * rating) stay as they are. A pure function so it can be tested without a
 * database (CI has none).
 */
export const formerMemberEventsWhere = (
  groupId: string,
  userId: string,
  now: Date,
): Prisma.EventWhereInput => ({
  groupId,
  visibility: 'members',
  startsAt: { gt: now },
  organizerUserId: { not: userId },
  participations: { some: { userId, status: { in: [...HELD_STATUSES] } } },
});

/**
 * Inside the caller's transaction, withdraws the user's places and waiting
 * requests on the group's upcoming members-only events (#266, variant A).
 * Call it in the same transaction that ends the active membership – leaving
 * (B-053) and, once it exists, a block (#63) – so there is no moment when
 * someone outside the group still holds a place. The places are free at
 * once: occupancy and „Chybí ještě X“ count approved participations live.
 * The events are locked as joining and deciding requests lock them (#53): an
 * approval of the same request can't overlap and turn it back to approved.
 * A join running at the same time can't slip in between the lookup and the
 * lock either: it locks the membership row the caller has just deleted, so
 * it waits and then finds no membership; or it locked it first, the delete
 * waited for it, and this lookup sees its place (`EventRepository.join`).
 *
 * Returns the events where an approved place was freed, read under the lock:
 * their organizers hear of it after the commit (`participant-left`, #398), as
 * when someone leaves the event. A withdrawn request tells nobody, as today.
 * Only a published or cancelled event – the ones its participants can leave
 * themselves; a hidden or deleted one has no page to leave from.
 */
export async function withdrawFromMembersOnlyEvents(
  tx: Prisma.TransactionClient,
  groupId: string,
  userId: string,
  now: Date,
): Promise<string[]> {
  const events = await tx.event.findMany({
    where: formerMemberEventsWhere(groupId, userId, now),
    select: { id: true, status: true },
    orderBy: { id: 'asc' },
  });
  if (events.length === 0) return [];
  const ids = events.map((event) => event.id);
  // in the id order, so two of these can't deadlock
  await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`;
  // under the lock: an approval just before leaving still tells the organizer
  const approved = await tx.participation.findMany({
    where: { userId, eventId: { in: ids }, status: 'approved' },
    select: { eventId: true },
  });
  await tx.participation.updateMany({
    where: {
      userId,
      eventId: { in: ids },
      status: { in: [...HELD_STATUSES] },
    },
    data: { status: 'withdrawn', approvedAt: null },
  });
  const leavable = new Set(
    events
      .filter((event) => LEAVABLE_STATUSES.has(event.status))
      .map((event) => event.id),
  );
  return ids.filter(
    (id) => leavable.has(id) && approved.some(({ eventId }) => eventId === id),
  );
}
