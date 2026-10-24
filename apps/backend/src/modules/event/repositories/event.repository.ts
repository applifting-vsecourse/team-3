import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { computeCapacity } from '@/modules/event/domain/capacity';
import {
  EventDetail,
  EventParticipant,
  PublicEvent,
  PublicEventFilters,
} from '@/modules/event/domain/event';
import {
  JoinDecision,
  JoinState,
  ParticipationRefusal,
  ParticipationStatus,
} from '@/modules/event/domain/participation';
import { Injectable } from '@nestjs/common';
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

  async isActiveGroupMember(groupId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { status: true },
    });
    return member?.status === 'active';
  }
}
