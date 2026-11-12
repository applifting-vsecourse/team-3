import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  EventRating,
  EventRatingInput,
  EventRatingRefusal,
  EventRatingState,
  isEventGone,
} from '@/modules/rating/domain/event-rating';
import { Injectable } from '@nestjs/common';

/** What rating an event depends on, read for one user. */
export type EventRatingSnapshot = {
  state: EventRatingState;
  rating: (EventRating & { deletedAt: Date | null }) | null;
};

const ratingSelect = {
  eventStars: true,
  organizerStars: true,
  comment: true,
  updatedAt: true,
} satisfies Prisma.RatingSelect;

type Client = Prisma.TransactionClient | PrismaService;

@Injectable()
export class RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The event, the user's participation and rating; null without the event. */
  findEventRating(
    eventId: string,
    userId: string,
  ): Promise<EventRatingSnapshot | null> {
    return readSnapshot(this.prisma, eventId, userId);
  }

  /**
   * Gives or changes the user's rating of the event and its organizer under
   * a row lock on the event, like joining it: a superadmin hiding the event
   * or a second click at the same moment waits, so `decide` sees the state
   * that holds when the rating is written. The answer carries that state,
   * so the caller needs no read of its own outside the lock. Null when the
   * event doesn't exist for users: unknown, hidden or deleted.
   */
  async saveEventRating(
    eventId: string,
    userId: string,
    input: EventRatingInput,
    decide: (
      state: EventRatingState,
    ) => { ok: true } | { ok: false; refusal: EventRatingRefusal },
  ): Promise<
    | { ok: true; rating: EventRating; state: EventRatingState }
    | { ok: false; refusal: EventRatingRefusal }
    | null
  > {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const snapshot = await readSnapshot(tx, eventId, userId);
      if (!snapshot || isEventGone(snapshot.state.eventStatus)) return null;
      const decision = decide(snapshot.state);
      if (!decision.ok) return decision;
      const rating = await tx.rating.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId, ...input },
        update: input,
        select: ratingSelect,
      });
      return { ok: true, rating, state: snapshot.state };
    });
  }
}

async function readSnapshot(
  client: Client,
  eventId: string,
  userId: string,
): Promise<EventRatingSnapshot | null> {
  const [event, participation, rating] = await Promise.all([
    client.event.findUnique({
      where: { id: eventId },
      select: {
        status: true,
        startsAt: true,
        endsAt: true,
        organizerUserId: true,
      },
    }),
    client.participation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    }),
    client.rating.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { ...ratingSelect, deletedAt: true },
    }),
  ]);
  if (!event) return null;
  return {
    state: {
      eventStatus: event.status,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      organizerUserId: event.organizerUserId,
      raterId: userId,
      participationStatus: participation?.status ?? null,
      ratingDeleted: rating?.deletedAt != null,
    },
    rating,
  };
}
