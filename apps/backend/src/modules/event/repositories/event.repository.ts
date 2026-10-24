import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { computeCapacity } from '@/modules/event/domain/capacity';
import {
  EventDetail,
  EventParticipant,
  PublicEvent,
  PublicEventFilters,
} from '@/modules/event/domain/event';
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

  async isActiveGroupMember(groupId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { status: true },
    });
    return member?.status === 'active';
  }
}
