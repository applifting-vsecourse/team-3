import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  publicEventInclude,
  PublicEventRow,
} from '@/modules/event/repositories/event.repository';
import {
  EventRating,
  EventRatingInput,
  EventRatingRefusal,
  EventRatingState,
  isEventGone,
  RatedEvent,
} from '@/modules/rating/domain/event-rating';
import {
  GivenParticipantRating,
  ParticipantRatingInput,
  ParticipantRatingRefusal,
  RatedParticipantState,
} from '@/modules/rating/domain/participant-rating';
import { ReceivedRating } from '@/modules/rating/domain/received-ratings';
import { Injectable } from '@nestjs/common';

/** What rating an event depends on, read for one user. */
export type EventRatingSnapshot = {
  state: EventRatingState;
  /** What the rating page shows of the event (Figma C-03). */
  event: RatedEvent;
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
  /** Below its minimum it didn't take place (EVENT_NOT_HELD). */
  minParticipants: number;
  approvedCount: number;
};

/** An approved participant with the organizer's rating of them. */
export type ParticipantWithRating = {
  id: string;
  name: string;
  rating: (GivenParticipantRating & { deletedAt: Date | null }) | null;
};

/** The organizer's ratings of an event's approved participants. */
export type ParticipantRatingsSnapshot = {
  event: RatableEvent;
  participants: ParticipantWithRating[];
};

const ratedEventSelect = {
  status: true,
  startsAt: true,
  endsAt: true,
  organizerUserId: true,
  minParticipants: true,
  _count: {
    select: { participations: { where: { status: 'approved' } } },
  },
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
    | {
        ok: true;
        rating: EventRating;
        state: EventRatingState;
        event: RatedEvent;
      }
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
      return { ok: true, rating, state: snapshot.state, event: snapshot.event };
    });
  }

  /**
   * The event as rating depends on it, without its participants: who asks
   * and whether it exists are checked on this before the participants are
   * read (review #314). Null without the event.
   */
  findRatableEvent(eventId: string): Promise<RatableEvent | null> {
    return readRatableEvent(this.prisma, eventId);
  }

  /**
   * Who may see the ratings the event got: whether the user is its organizer
   * and, for an event of a group, an active admin of the group. Null without
   * the event, or for one a superadmin hid or deleted.
   */
  async findEventManager(
    eventId: string,
    userId: string,
  ): Promise<{ isOrganizer: boolean; isGroupAdmin: boolean } | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { status: true, organizerUserId: true, groupId: true },
    });
    if (!event || isEventGone(event.status)) return null;
    const member = event.groupId
      ? await this.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId: event.groupId, userId } },
          select: { role: true, status: true },
        })
      : null;
    return {
      isOrganizer: event.organizerUserId === userId,
      isGroupAdmin: member?.role === 'admin' && member.status === 'active',
    };
  }

  /**
   * The participants' ratings of the event, newest first, without the ones a
   * superadmin deleted (B-060, #66).
   */
  async findReceivedRatings(eventId: string): Promise<ReceivedRating[]> {
    const ratings = await this.prisma.rating.findMany({
      where: { eventId, deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      select: {
        ...ratingSelect,
        user: { select: { id: true, name: true } },
      },
    });
    return ratings.map(({ user, ...rating }) => ({ author: user, ...rating }));
  }

  /**
   * The event's approved participants in the order they got their place
   * (D-03), each with the organizer's rating of them, deleted ones included so
   * the caller can say they can't be given again.
   */
  findParticipantsWithRatings(
    eventId: string,
  ): Promise<ParticipantWithRating[]> {
    return readParticipants(this.prisma, eventId);
  }

  /**
   * Gives or changes the organizer's ratings of several participants at
   * once (B-060, rychlé hodnocení): one transaction under a row lock on the
   * event. `decide` gets the event and every listed participant as read under
   * the lock and decides for all of them at once (review #314); when it
   * refuses, nothing is written. The ratings are written by one statement
   * (INSERT … ON CONFLICT), not one by one, so a list of hundreds keeps the
   * lock short and the transaction far from its timeout (review #314). On
   * success the answer is the view read in the same transaction, after the
   * write (#313). Null when the event doesn't exist for users: unknown,
   * hidden or deleted.
   */
  async saveParticipantRatings(
    eventId: string,
    inputs: ParticipantRatingInput[],
    decide: (
      event: RatableEvent,
      participants: RatedParticipantState[],
    ) =>
      | { ok: true }
      | {
          ok: false;
          refusal: ParticipantRatingRefusal;
          participantId?: string;
        },
  ): Promise<
    | { ok: true; snapshot: ParticipantRatingsSnapshot }
    | { ok: false; refusal: ParticipantRatingRefusal; participantId?: string }
    | null
  > {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const ids = inputs.map((input) => input.participantId);
      const [event, participations, ratings] = await Promise.all([
        readRatableEvent(tx, eventId),
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
      const decision = decide(
        event,
        ids.map((participantId) => ({
          participantId,
          participationStatus: statusOf.get(participantId) ?? null,
          ratingDeleted: deleted.has(participantId),
        })),
      );
      if (!decision.ok) return decision;
      // One statement for the whole list; a new row gets its id from the
      // database, an existing one keeps it. gen_random_uuid() and not a cuid
      // like the rest of the schema (review #314): `@default(cuid())` is made
      // by Prisma's client, so a raw INSERT for many rows has none to use; the
      // column is text and nothing depends on the shape of the id, and
      // Postgres has the function built in since 13.
      await tx.$executeRaw`
        INSERT INTO "participant_rating"
          ("id", "eventId", "participantId", "stars", "comment", "createdAt", "updatedAt")
        SELECT gen_random_uuid()::text, ${eventId}, r."participantId", r."stars", r."comment", now(), now()
        FROM unnest(
          ${ids}::text[],
          ${inputs.map((input) => input.stars)}::int[],
          ${inputs.map((input) => input.comment)}::text[]
        ) AS r("participantId", "stars", "comment")
        ON CONFLICT ("eventId", "participantId") DO UPDATE
        SET "stars" = EXCLUDED."stars",
            "comment" = EXCLUDED."comment",
            "updatedAt" = now()`;
      return {
        ok: true,
        snapshot: { event, participants: await readParticipants(tx, eventId) },
      };
    });
  }
}

async function readSnapshot(
  client: Client,
  eventId: string,
  userId: string,
): Promise<EventRatingSnapshot | null> {
  const [event, participation, rating] = await Promise.all([
    // the same as an event card, so the page needs no read of the event's
    // detail – which a former member of the group no longer gets (#66)
    client.event.findUnique({
      where: { id: eventId },
      include: publicEventInclude,
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
      minParticipants: event.minParticipants,
      approvedCount: event._count.participations,
      organizerUserId: event.organizerUserId,
      raterId: userId,
      participationStatus: participation?.status ?? null,
      ratingDeleted: rating?.deletedAt != null,
    },
    event: toRatedEvent(event),
    rating,
  };
}

async function readRatableEvent(
  client: Client,
  eventId: string,
): Promise<RatableEvent | null> {
  const event = await client.event.findUnique({
    where: { id: eventId },
    select: ratedEventSelect,
  });
  if (!event) return null;
  const { _count, ...rest } = event;
  return { ...rest, approvedCount: _count.participations };
}

async function readParticipants(
  client: Client,
  eventId: string,
): Promise<ParticipantWithRating[]> {
  const participations = await client.participation.findMany({
    where: { eventId, status: 'approved' },
    orderBy: [{ approvedAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    select: {
      user: { select: { id: true, name: true } },
      rating: { select: { ...participantRatingSelect, deletedAt: true } },
    },
  });
  return participations.map(({ user, rating }) => ({
    id: user.id,
    name: user.name,
    rating,
  }));
}

function toRatedEvent(event: PublicEventRow): RatedEvent {
  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    address: event.address,
    // a hidden or deleted event never leaves the service (404)
    status: event.status === 'cancelled' ? 'cancelled' : 'published',
    activity: {
      id: event.activity.id,
      slug: event.activity.slug,
      name: event.activity.name,
      category: {
        id: event.activity.category.id,
        slug: event.activity.category.slug,
        name: event.activity.category.name,
        icon: event.activity.category.icon,
      },
    },
    locality: {
      id: event.locality.id,
      slug: event.locality.slug,
      name: event.locality.name,
    },
    organizer: event.organizer,
    group: event.group,
    approvedCount: event._count.participations,
    minParticipants: event.minParticipants,
  };
}
