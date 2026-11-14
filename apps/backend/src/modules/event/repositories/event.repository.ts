import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { computeCapacity } from '@/modules/event/domain/capacity';
import {
  EventDetail,
  EventParticipant,
  EventRequest,
  GroupEvent,
  GroupEventsWhen,
  MyEvent,
  MyEventsTab,
  NewEvent,
  PublicEvent,
  PublicEventFilters,
} from '@/modules/event/domain/event';
import {
  EventMessage,
  MessageInput,
  MessageRefusal,
} from '@/modules/event/domain/event-message';
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
import { summarize } from '@/modules/event/domain/summary';
import {
  RatingSummary,
  summarizeTotals,
} from '@/modules/rating/domain/rating-summary';
import { requestMessageFor } from '@/shared/request-message/request-message';
import { Injectable } from '@nestjs/common';
import { buildGroupEventsWhere } from './group-events-where';
import { buildMyEventsWhere } from './my-events-where';
import { buildPublicEventsWhere } from './public-events-where';

// What the list and the detail both show of an event (and the profile's event cards, #178).
export const publicEventInclude = {
  activity: { include: { category: true } },
  locality: true,
  organizer: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
  _count: {
    select: { participations: { where: { status: 'approved' } } },
  },
} satisfies Prisma.EventInclude;

export type PublicEventRow = Prisma.EventGetPayload<{
  include: typeof publicEventInclude;
}>;

const messageSelect = {
  id: true,
  subject: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, name: true } },
} satisfies Prisma.EventMessageSelect;

export const toPublicEvent = (
  event: PublicEventRow,
  now: Date,
): PublicEvent => ({
  id: event.id,
  title: event.title,
  summary: summarize(event.description),
  distanceKm: null,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  address: event.address,
  lat: event.lat,
  lng: event.lng,
  activity: {
    id: event.activity.id,
    slug: event.activity.slug,
    name: event.activity.name,
    keywords: event.activity.keywords,
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
    // soonest first; Proběhlé newest first (#61)
    const order = query.filters.past ? 'desc' : 'asc';
    const events = await this.prisma.event.findMany({
      where: buildPublicEventsWhere(query.filters, query.now),
      include: publicEventInclude,
      // id breaks ties so the cut-off at `limit` is stable
      orderBy: [{ startsAt: order }, { id: order }],
      take: query.limit,
    });
    return events.map((event) => toPublicEvent(event, query.now));
  }

  /**
   * The average rating of each event (its `eventStars`) for the past cards of
   * Proběhlé (#61), without ratings a superadmin deleted. An event nobody
   * rated isn't there.
   */
  async eventRatings(eventIds: string[]): Promise<Map<string, RatingSummary>> {
    if (eventIds.length === 0) return new Map();
    const rows = await this.prisma.rating.groupBy({
      by: ['eventId'],
      where: { eventId: { in: eventIds }, deletedAt: null },
      _sum: { eventStars: true },
      _count: { _all: true },
    });
    return new Map(
      rows.map((row) => [
        row.eventId,
        summarizeTotals(row._sum.eventStars ?? 0, row._count._all),
      ]),
    );
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
   * A section of a group's page (B-055), at most `limit`: upcoming soonest
   * first, past the latest first.
   */
  async findGroupEvents(query: {
    groupId: string;
    when: GroupEventsWhen;
    includeMembersOnly: boolean;
    now: Date;
    limit: number;
  }): Promise<GroupEvent[]> {
    const { groupId, when, includeMembersOnly, now } = query;
    const order = when === 'upcoming' ? 'asc' : 'desc';
    const events = await this.prisma.event.findMany({
      where: buildGroupEventsWhere(groupId, when, { includeMembersOnly }, now),
      include: publicEventInclude,
      orderBy: [{ startsAt: order }, { id: order }],
      take: query.limit,
    });
    return events.map((event) => ({
      ...toPublicEvent(event, now),
      // the group's events are public or members-only (createEvent)
      visibility: event.visibility === 'members' ? 'members' : 'public',
    }));
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
      select: {
        updatedAt: true,
        message: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });
    return participations.map(({ user, updatedAt, message }) => ({
      ...user,
      requestedAt: updatedAt,
      message,
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

  /**
   * What creating an event of the group needs to know (B-055): its activity,
   * whether it is active and the user's role in it while their membership is
   * active. Null for no such group.
   */
  async findGroupForEvent(
    groupId: string,
    userId: string,
  ): Promise<{
    activityId: string;
    status: 'active' | 'inactive';
    role: 'admin' | 'member' | null;
  } | null> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        activityId: true,
        status: true,
        members: {
          where: { userId, status: 'active' },
          select: { role: true },
        },
      },
    });
    if (!group) return null;
    return {
      activityId: group.activityId,
      status: group.status,
      role: group.members[0]?.role ?? null,
    };
  }

  /** A new published event of a person or a group (B-021, B-055); returns its id. */
  /**
   * A group's event is written under a row lock on the group (review #264):
   * deactivating updates that row, so the two can't overlap. Created first,
   * the event is there when the deactivation cancels the group's events;
   * deactivated first, nothing is written and the answer is null.
   */
  async createEvent(
    event: NewEvent,
    organizerUserId: string,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      if (event.groupId) {
        await tx.$executeRaw`SELECT 1 FROM "group" WHERE "id" = ${event.groupId} FOR UPDATE`;
        const group = await tx.group.findUnique({
          where: { id: event.groupId },
          select: { status: true },
        });
        if (group?.status !== 'active') return null;
      }
      const created = await tx.event.create({
        data: { ...event, organizerUserId },
        select: { id: true },
      });
      return created.id;
    });
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
    message: string | null,
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
      // the message goes only with a request (#175); a new request replaces
      // the one of a withdrawn request
      const data = {
        status: decision.status,
        approvedAt,
        message: requestMessageFor(decision.status, message),
      };
      // one row per user and event: coming back after withdrawing reuses it
      await tx.participation.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId, ...data },
        update: data,
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

  /** The event's messages to its participants, newest first, at most `limit` (#176). */
  async findMessages(eventId: string, limit: number): Promise<EventMessage[]> {
    return this.prisma.eventMessage.findMany({
      where: { eventId },
      select: messageSelect,
      // id breaks ties of two in the same millisecond
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }

  /** How many messages the event has in all (the count in the section's heading). */
  async countMessages(eventId: string): Promise<number> {
    return this.prisma.eventMessage.count({ where: { eventId } });
  }

  /** How many messages the event has sent since `since` (the daily limit). */
  async countMessagesSince(eventId: string, since: Date): Promise<number> {
    return this.prisma.eventMessage.count({
      where: { eventId, createdAt: { gte: since } },
    });
  }

  /**
   * Writes the message under a row lock on the event, like joining: a cancel
   * or another message at the same moment waits, so `decide` sees the state
   * that holds when it is written and the daily limit can't be overrun by two
   * clicks at once. Null when the event is gone.
   */
  async createMessage(
    eventId: string,
    senderId: string,
    input: MessageInput,
    since: Date,
    decide: (state: {
      eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
      sentToday: number;
    }) => { ok: true } | { ok: false; refusal: MessageRefusal },
  ): Promise<
    | { ok: true; message: EventMessage }
    | { ok: false; refusal: MessageRefusal }
    | null
  > {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const [event, sentToday] = await Promise.all([
        tx.event.findUnique({
          where: { id: eventId },
          select: { status: true },
        }),
        tx.eventMessage.count({
          where: { eventId, createdAt: { gte: since } },
        }),
      ]);
      if (!event) return null;
      const decision = decide({ eventStatus: event.status, sentToday });
      if (!decision.ok) return decision;
      const message = await tx.eventMessage.create({
        data: { eventId, senderId, ...input },
        select: messageSelect,
      });
      return { ok: true, message };
    });
  }

  /**
   * The user's role in the group while their membership is active; null for
   * a pending, blocked or no membership.
   */
  async findActiveGroupRole(
    groupId: string,
    userId: string,
  ): Promise<'admin' | 'member' | null> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true, status: true },
    });
    return member?.status === 'active' ? member.role : null;
  }
}
