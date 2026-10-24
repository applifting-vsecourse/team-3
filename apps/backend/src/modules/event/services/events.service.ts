import { matchesCapacity } from '@/modules/event/domain/capacity';
import {
  EventDetail,
  EventDetailView,
  NewEvent,
  PublicEvent,
  PublicEventFilters,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

  /**
   * One event for its detail page (B-026), for visitors too: a shared link
   * opens without signing in. Unknown, hidden and deleted events, and a
   * members-only event for anyone outside the group, are all 404, so the
   * response doesn't reveal that such an event exists.
   */
  async getEventDetail(
    id: string,
    viewerId: string | null,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    const event = await this.eventRepository.findEventDetail(id, now);
    if (!event || !(await this.canView(event, viewerId))) {
      throw new NotFoundException('Event not found');
    }
    const participants = viewerId
      ? await this.eventRepository.findApprovedParticipants(event.id)
      : null;
    return { ...event, participants };
  }

  /**
   * Creates an event of the signed-in user (B-021). The organizer is always
   * `organizerId` from the session, never something from the request body.
   * Returns the new event as its detail shows it to the organizer.
   */
  async createEvent(
    event: NewEvent,
    organizerId: string,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    // a date in the past can't be saved (the DTO can't know „now“ in tests)
    if (event.startsAt <= now) {
      throw new BadRequestException(['startsAt must be in the future']);
    }
    const refs = await this.eventRepository.catalogRefsExist(
      event.activityId,
      event.localityId,
    );
    const problems = [
      refs.activity ? null : 'activityId must be an existing activity',
      refs.locality ? null : 'localityId must be an existing locality',
    ].filter((problem): problem is string => problem !== null);
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }

    const id = await this.eventRepository.createEvent(event, organizerId);
    return this.getEventDetail(id, organizerId, now);
  }

  private async canView(
    event: EventDetail,
    viewerId: string | null,
  ): Promise<boolean> {
    // a cancelled event stays reachable, with its reason (#52)
    if (event.status === 'hidden' || event.status === 'deleted') return false;
    // a private event is reachable by anyone with the link
    if (event.visibility !== 'members') return true;
    if (!viewerId) return false;
    if (event.organizer.id === viewerId) return true;
    return (
      event.group !== null &&
      this.eventRepository.isActiveGroupMember(event.group.id, viewerId)
    );
  }
}
