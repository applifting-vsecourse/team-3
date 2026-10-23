import { PrismaService } from '@/core/prisma/prisma.service';
import { computeCapacity } from '@/modules/event/domain/capacity';
import { PublicEvent, PublicEventFilters } from '@/modules/event/domain/event';
import { Injectable } from '@nestjs/common';
import { buildPublicEventsWhere } from './public-events-where';

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
      include: {
        activity: { include: { category: true } },
        locality: true,
        organizer: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        _count: {
          select: { participations: { where: { status: 'approved' } } },
        },
      },
      // id breaks ties so the cut-off at `limit` is stable
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: query.limit,
    });
    return events.map((event) => ({
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
      isPromoted:
        event.promotedUntil !== null && event.promotedUntil > query.now,
    }));
  }
}
