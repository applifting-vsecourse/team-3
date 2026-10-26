import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { computeCapacity } from '@/modules/event/domain/capacity';
import {
  EventDetail,
  EventParticipant,
  EventRequest,
  MyEvent,
  MyEventsTab,
  NewEvent,
  PublicEvent,
  PublicEventFilters,
} from '@/modules/event/domain/event';
import {
  UpdateDecision,
  UpdateState,
} from '@/modules/event/domain/event-update';
import { INTEREST_STATUSES } from '@/modules/event/domain/interest';
import {
  JoinDecision,
  JoinState,
  ParticipationRefusal,
  ParticipationStatus,
  RequestsState,
} from '@/modules/event/domain/participation';
import { Injectable } from '@nestjs/common';
import { buildMyEventsWhere } from './my-events-where';
import { buildPublicEventsWhere } from './public-events-where';

// What the list and the detail both show of an event.
const publicEventInclude = {
  activity: { include: { category: true } },
  locality: true,
  organizer: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
  _count: {
    select: { participations: { where: { status: 'approved' } } },
  },
} satisfies Prisma.EventInclude;

type PublicEventRow = Prisma.EventGetPayload<{
  include: typeof publicEventInclude;
}>;

const toPublicEvent = (event: PublicEventRow, now: Date): PublicEvent => ({
  id: event.id,
  title: event.title,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  address: event.address,
  lat: event.lat,
  lng: event.lng,
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
  minParticipants: event.minParticipants,
  maxParticipants: event.maxParticipants,
  capacity: computeCapacity(event, event._count.participations),
  isPromoted: event.promotedUntil !== null && event.promotedUntil > now,
});

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Public upcoming events, soonest first, at most `limit`. */
  async findPublicEvents(query: {
    filters: PublicEventFilters;
    now: Date;
    limit: number;
  }): Promise<PublicEvent[]> {
    const events = await this.prisma.event.findMany({
      where: buildPublicEventsWhere(query.filters, query.now),
      include: publicEventInclude,
      // id breaks ties so the cut-off at `limit` is stable
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: query.limit,
    });
    return events.map((event) => toPublicEvent(event, query.now));
  }

  /**
   * Interest in the public events matching the filters (#156): people with a
   * place plus requests waiting for the organizer, per event id, counted by
   * the database in one query. An event nobody is interested in isn't there.
   */
  async countInterest(
    filters: PublicEventFilters,
    now: Date,
  ): Promise<Map<string, number>> {
    const counts = await this.prisma.participation.groupBy({
      by: ['eventId'],
      where: {
        status: { in: INTEREST_STATUSES },
        event: buildPublicEventsWhere(filters, now),
      },
      _count: { _all: true },
    });
    return new Map(counts.map((row) => [row.eventId, row._count._all]));
  }

  /**
   * A tab of „Moje akce“ (B-035), soonest first, at most `limit`. Besides the
   * user's own participation, the organizer's tab loads the waiting requests
   * to count them.
   */
  async findMyEvents(query: {
    tab: MyEventsTab;
    userId: string;
    now: Date;
    limit: number;
  }): Promise<MyEvent[]> {
    const { tab, userId, now } = query;
    const events = await this.prisma.event.findMany({
      where: buildMyEventsWhere(tab, userId, now),
      include: {
        ...publicEventInclude,
        participations: {
          where:
            tab === 'organizing'
              ? { OR: [{ userId }, { status: 'pending' }] }
              : { userId },
          select: { userId: true, status: true },
        },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: query.limit,
    });
    return events.map((event) => {
      const mine = event.participations.find(
        (participation) => participation.userId === userId,
      )?.status;
      return {
        ...toPublicEvent(event, now),
        // the where lets through only these two
        status: event.status === 'cancelled' ? 'cancelled' : 'published',
        myParticipation:
          mine === 'approved' || mine === 'pending' ? mine : null,
        pendingRequests:
          tab === 'organizing'
            ? event.participations.filter(
                (participation) => participation.status === 'pending',
              ).length
            : null,
      };
    });
  }

  /**
   * Any event by id, whatever its status and visibility; who may see it is
   * the service's call.
   */
  async findEventDetail(id: string, now: Date): Promise<EventDetail | null> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: publicEventInclude,
    });
    if (!event) return null;
    return {
      ...toPublicEvent(event, now),
      description: event.description,
      approvalMode: event.approvalMode,
      visibility: event.visibility,
      status: event.status,
      cancelReason: event.cancelReason,
    };
  }

  /** Approved participants in the order they got their place. */
  async findApprovedParticipants(eventId: string): Promise<EventParticipant[]> {
    const participations = await this.prisma.participation.findMany({
      where: { eventId, status: 'approved' },
      select: { user: { select: { id: true, name: true } } },
      orderBy: [{ approvedAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    });
    return participations.map((participation) => participation.user);
  }

  /**
   * Requests waiting for the organizer (#53), oldest first. A request after
   * a withdrawal reuses the row, so its last change is when it was sent.
   */
  async findPendingRequests(eventId: string): Promise<EventRequest[]> {
    const participations = await this.prisma.participation.findMany({
      where: { eventId, status: 'pending' },
      select: { updatedAt: true, user: { select: { id: true, name: true } } },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });
    return participations.map(({ user, updatedAt }) => ({
      ...user,
      requestedAt: updatedAt,
    }));
  }

  /** Whether the activity and the locality an event refers to exist. */
  async catalogRefsExist(
    activityId: string,
    localityId: string,
  ): Promise<{ activity: boolean; locality: boolean }> {
    const [activity, locality] = await Promise.all([
      this.prisma.activity.count({ where: { id: activityId } }),
      this.prisma.locality.count({ where: { id: localityId } }),
    ]);
    return { activity: activity > 0, locality: locality > 0 };
  }

  /** A new public, published event of a person (B-021); returns its id. */
  async createEvent(event: NewEvent, organizerUserId: string): Promise<string> {
    const created = await this.prisma.event.create({
      data: { ...event, organizerUserId },
      select: { id: true },
    });
    return created.id;
  }

  /**
   * Cancels the event (B-028): it is never deleted, only marked, with the
   * reason the participants see. Conditional on it still being published and
   * ahead, so of two cancels at once only one writes; false when none did.
   */
  async cancelEvent(id: string, reason: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.event.updateMany({
      where: { id, status: 'published', startsAt: { gt: now } },
      data: { status: 'cancelled', cancelReason: reason, cancelledAt: now },
    });
    return count === 1;
  }

  async findParticipationStatus(
    eventId: string,
    userId: string,
  ): Promise<ParticipationStatus | null> {
    const participation = await this.prisma.participation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    });
    return participation?.status ?? null;
  }

  /**
   * Joins under a row lock on the event (B-031): a second join of the same
   * event waits until the first has committed, so two people can't both take
   * the last place. `decide` gets the state read under the lock. Null when
   * the event doesn't exist.
   */
  async join(
    eventId: string,
    userId: string,
    decide: (state: JoinState) => JoinDecision,
  ): Promise<JoinDecision | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: {
          status: true,
          startsAt: true,
          approvalMode: true,
          maxParticipants: true,
          organizerUserId: true,
        },
      });
      if (!event) return null;
      const [existing, approvedCount] = await Promise.all([
        tx.participation.findUnique({
          where: { eventId_userId: { eventId, userId } },
          select: { status: true },
        }),
        tx.participation.count({ where: { eventId, status: 'approved' } }),
      ]);
      const decision = decide({
        eventStatus: event.status,
        startsAt: event.startsAt,
        approvalMode: event.approvalMode,
        maxParticipants: event.maxParticipants,
        isOrganizer: event.organizerUserId === userId,
        existingStatus: existing?.status ?? null,
        approvedCount,
      });
      if (!decision.ok) return decision;

      const approvedAt = decision.status === 'approved' ? new Date() : null;
      // one row per user and event: coming back after withdrawing reuses it
      await tx.participation.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId, status: decision.status, approvedAt },
        update: { status: decision.status, approvedAt, message: null },
      });
      return decision;
    });
  }

  /** Leaves an event or withdraws a request; the place is free again. */
  async leave(
    eventId: string,
    userId: string,
    decide: (state: {
      startsAt: Date;
      existingStatus: ParticipationStatus | null;
    }) => { ok: true } | { ok: false; refusal: ParticipationRefusal },
  ): Promise<
    { ok: true } | { ok: false; refusal: ParticipationRefusal } | null
  > {
    return this.prisma.$transaction(async (tx) => {
      // the same lock as joining and deciding requests: a withdrawal and the
      // organizer's approval of the same request can't overlap (#53)
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { startsAt: true },
      });
      if (!event) return null;
      const existing = await tx.participation.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { status: true },
      });
      const decision = decide({
        startsAt: event.startsAt,
        existingStatus: existing?.status ?? null,
      });
      if (!decision.ok) return decision;
      await tx.participation.update({
        where: { eventId_userId: { eventId, userId } },
        data: { status: 'withdrawn', approvedAt: null },
      });
      return decision;
    });
  }

  /**
   * Approves or rejects requests under the same row lock as joining (#53):
   * the approved count `decide` sees can't grow before the write, so two
   * approvals can't both take the last place. All the requests or none.
   * Null when the event doesn't exist.
   */
  async decideRequests(
    eventId: string,
    userIds: string[],
    outcome: 'approved' | 'rejected',
    decide: (
      state: RequestsState,
    ) => { ok: true } | { ok: false; refusal: ParticipationRefusal },
    now: Date,
  ): Promise<
    { ok: true } | { ok: false; refusal: ParticipationRefusal } | null
  > {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { status: true, startsAt: true, maxParticipants: true },
      });
      if (!event) return null;
      const [participations, approvedCount] = await Promise.all([
        tx.participation.findMany({
          where: { eventId, userId: { in: userIds } },
          select: { userId: true, status: true },
        }),
        tx.participation.count({ where: { eventId, status: 'approved' } }),
      ]);
      const statusOf = new Map(
        participations.map((participation) => [
          participation.userId,
          participation.status,
        ]),
      );
      const decision = decide({
        eventStatus: event.status,
        startsAt: event.startsAt,
        maxParticipants: event.maxParticipants,
        approvedCount,
        requestStatuses: userIds.map((userId) => statusOf.get(userId) ?? null),
      });
      if (!decision.ok) return decision;
      await tx.participation.updateMany({
        where: { eventId, userId: { in: userIds }, status: 'pending' },
        data: {
          status: outcome,
          approvedAt: outcome === 'approved' ? now : null,
        },
      });
      return decision;
    });
  }

  /**
   * Changes the event under the same row lock as joining (#41): the state
   * `decide` sees can't change before the write, so the maximum is never
   * lowered below the people who have a place, and a cancel that came first
   * is seen. Writes what `decide` says; null when the event doesn't exist.
   */
  async updateEvent(
    id: string,
    decide: (state: UpdateState) => UpdateDecision,
  ): Promise<UpdateDecision | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${id} FOR UPDATE`;
      const event = await tx.event.findUnique({
        where: { id },
        select: {
          status: true,
          startsAt: true,
          endsAt: true,
          minParticipants: true,
          maxParticipants: true,
        },
      });
      if (!event) return null;
      const approvedCount = await tx.participation.count({
        where: { eventId: id, status: 'approved' },
      });
      const decision = decide({ ...event, approvedCount });
      if (!decision.ok) return decision;
      await tx.event.update({ where: { id }, data: decision.data });
      return decision;
    });
  }

  async isActiveGroupMember(groupId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { status: true },
    });
    return member?.status === 'active';
  }
}
