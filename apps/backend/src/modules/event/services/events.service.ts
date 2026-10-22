import { PublicEvent, PublicEventFilters } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { Injectable } from '@nestjs/common';

// One endpoint serves both the list and the map in sprint 2, without paging
// (deviation from B-023, which has paging and a separate /events/map).
export const PUBLIC_EVENTS_LIMIT = 200;
// Safety cap for missingOnly, which has to load events before filtering. The
// endpoint is public, so the query must stay bounded however many events exist.
export const MISSING_ONLY_SCAN_LIMIT = 2000;

@Injectable()
export class EventsService {
  constructor(private readonly eventRepository: EventRepository) {}

  /** Upcoming public events matching the filters, soonest first, at most PUBLIC_EVENTS_LIMIT. */
  async getPublicEvents(
    filters: PublicEventFilters,
    now: Date = new Date(),
  ): Promise<PublicEvent[]> {
    if (!filters.missingOnly) {
      return this.eventRepository.findPublicEvents({
        filters,
        now,
        limit: PUBLIC_EVENTS_LIMIT,
      });
    }
    // missingOnly compares approved participations with the minimum, which the
    // database query can't do. Filter first, then cut, or events that miss
    // people could fall behind the limit.
    const events = await this.eventRepository.findPublicEvents({
      filters,
      now,
      limit: MISSING_ONLY_SCAN_LIMIT,
    });
    return events
      .filter((event) => event.capacity.missingToMin > 0)
      .slice(0, PUBLIC_EVENTS_LIMIT);
  }
}
