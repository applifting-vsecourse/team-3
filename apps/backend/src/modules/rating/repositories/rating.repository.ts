import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  EventRating,
  EventRatingInput,
  EventRatingRefusal,
  EventRatingState,
  isEventGone,
} from '@/modules/rating/domain/event-rating';
import {
  GivenParticipantRating,
  ParticipantRatingInput,
  ParticipantRatingRefusal,
  ParticipantRatingState,
} from '@/modules/rating/domain/participant-rating';
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

/** The event as rating depends on it. */
export type RatableEvent = {
  status: 'published' | 'cancelled' | 'hidden' | 'deleted';
  startsAt: Date;
  endsAt: Date | null;
  organizerUserId: string;
};

/** The organizer's ratings of an event's approved participants. */
export type ParticipantRatingsSnapshot = {
  event: RatableEvent;
  participants: {
    id: string;
    name: string;
    rating: (GivenParticipantRating & { deletedAt: Date | null }) | null;
  }[];
};

const ratedEventSelect = {
  status: true,
  startsAt: true,
  endsAt: true,
  organizerUserId: true,
} satisfies Prisma.EventSelect;

const participantRatingSelect = {
  stars: true,
  comment: true,
  updatedAt: true,
} satisfies Prisma.ParticipantRatingSelect;

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

  /**
   * The event and its approved participants in the order they got their
   * place (D-03), each with the organizer's rating of them, deleted ones
   * included so the caller can say they can't be given again. Null without
   * the event.
   */
  async findParticipantRatings(
    eventId: string,
  ): Promise<ParticipantRatingsSnapshot | null> {
    return readParticipantRatings(this.prisma, eventId);
  }

  /**
   * Gives or changes the organizer's ratings of several participants at
   * once (B-060, rychlé hodnocení): one transaction under a row lock on the
   * event, each rating decided on the state read under the lock. When one is
   * refused, none is written and the refusal says whose it was. On success
   * the answer is the view read in the same transaction, after the writes
   * (#313). Null when the event doesn't exist for users: unknown, hidden or
   * deleted.
   */
  async saveParticipantRatings(
    eventId: string,
    raterId: string,
    inputs: ParticipantRatingInput[],
    decide: (
      state: ParticipantRatingState,
    ) => { ok: true } | { ok: false; refusal: ParticipantRatingRefusal },
  ): Promise<
    | { ok: true; snapshot: ParticipantRatingsSnapshot }
    | { ok: false; refusal: ParticipantRatingRefusal; participantId: string }
    | null
  > {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const ids = inputs.map((input) => input.participantId);
      const [event, participations, ratings] = await Promise.all([
        tx.event.findUnique({
          where: { id: eventId },
          select: ratedEventSelect,
        }),
        tx.participation.findMany({
          where: { eventId, userId: { in: ids } },
          select: { userId: true, status: true },
        }),
        tx.participantRating.findMany({
          where: { eventId, participantId: { in: ids } },
          select: { participantId: true, deletedAt: true },
        }),
      ]);
      if (!event || isEventGone(event.status)) return null;
      const statusOf = new Map(
        participations.map((p) => [p.userId, p.status] as const),
      );
      const deleted = new Set(
        ratings.filter((r) => r.deletedAt !== null).map((r) => r.participantId),
      );
      for (const { participantId } of inputs) {
        const decision = decide({
          eventStatus: event.status,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          organizerUserId: event.organizerUserId,
          raterId,
          participantId,
          participationStatus: statusOf.get(participantId) ?? null,
          ratingDeleted: deleted.has(participantId),
        });
        if (!decision.ok) return { ...decision, participantId };
      }
      for (const { participantId, stars, comment } of inputs) {
        await tx.participantRating.upsert({
          where: { eventId_participantId: { eventId, participantId } },
          create: { eventId, participantId, stars, comment },
          update: { stars, comment },
        });
      }
      const snapshot = await readParticipantRatings(tx, eventId);
      // the row is locked: it can't have gone since it was read above
      return snapshot ? { ok: true, snapshot } : null;
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

async function readParticipantRatings(
  client: Client,
  eventId: string,
): Promise<ParticipantRatingsSnapshot | null> {
  const event = await client.event.findUnique({
    where: { id: eventId },
    select: {
      ...ratedEventSelect,
      participations: {
        where: { status: 'approved' },
        orderBy: [
          { approvedAt: { sort: 'asc', nulls: 'last' } },
          { id: 'asc' },
        ],
        select: {
          user: { select: { id: true, name: true } },
          rating: {
            select: { ...participantRatingSelect, deletedAt: true },
          },
        },
      },
    },
  });
  if (!event) return null;
  const { participations, ...rated } = event;
  return {
    event: rated,
    participants: participations.map(({ user, rating }) => ({
      id: user.id,
      name: user.name,
      rating,
    })),
  };
}
