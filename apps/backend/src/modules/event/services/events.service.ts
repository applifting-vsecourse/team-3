import { matchesCapacity } from '@/modules/event/domain/capacity';
import { PublicEvent, PublicEventFilters } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { Injectable } from '@nestjs/common';

// One endpoint serves both the list and the map in sprint 2, without paging
// (deviation from B-023, which has paging and a separate /events/map).
export const PUBLIC_EVENTS_LIMIT = 200;
// Safety cap for the capacity filter, which has to load events before
// filtering. The endpoint is public, so the query must stay bounded however
// many events exist.
export const CAPACITY_SCAN_LIMIT = 2000;

@Injectable()
export class EventsService {
  constructor(private readonly eventRepository: EventRepository) {}

  /** Upcoming public events matching the filters, soonest first, at most PUBLIC_EVENTS_LIMIT. */
  async getPublicEvents(
    filters: PublicEventFilters,
    now: Date = new Date(),
  ): Promise<PublicEvent[]> {
    const { capacity } = filters;
    if (!capacity) {
      return this.eventRepository.findPublicEvents({
        filters,
        now,
        limit: PUBLIC_EVENTS_LIMIT,
      });
    }
    // The capacity filter compares approved participations with the minimum and
    // maximum, which the database query can't do. Filter first, then cut, or
    // matching events could fall behind the limit.
    const events = await this.eventRepository.findPublicEvents({
      filters,
      now,
      limit: CAPACITY_SCAN_LIMIT,
    });
    return events
      .filter((event) => matchesCapacity(event.capacity, capacity))
      .slice(0, PUBLIC_EVENTS_LIMIT);
  }
}
