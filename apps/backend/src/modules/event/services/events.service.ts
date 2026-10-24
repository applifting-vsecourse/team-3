import { matchesCapacity } from '@/modules/event/domain/capacity';
import {
  EventChanges,
  EventDetail,
  EventDetailView,
  NewEvent,
  PublicEvent,
  PublicEventFilters,
} from '@/modules/event/domain/event';
import {
  decideUpdate,
  lifecycleRefusal,
  UpdateRefusal,
} from '@/modules/event/domain/event-update';
import {
  decideJoin,
  decideLeave,
  ParticipationRefusal,
} from '@/modules/event/domain/participation';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/** Shown as they are in the app (409 with the code). */
const REFUSAL_MESSAGES: Record<ParticipationRefusal, string> = {
  EVENT_FULL: 'Akce je plná.',
  ALREADY_JOINED: 'Na akci už jste přihlášení.',
  EVENT_STARTED: 'Akce už začala.',
  EVENT_CANCELLED: 'Akce je zrušená.',
  PARTICIPATION_REFUSED: 'Organizátor vaši účast zamítl.',
  NOT_JOINED: 'Na akci nejste přihlášení.',
};

const refused = (refusal: ParticipationRefusal): ConflictException =>
  new ConflictException({ code: refusal, message: REFUSAL_MESSAGES[refusal] });

const updateRefused = (refusal: UpdateRefusal): HttpException => {
  switch (refusal.code) {
    case 'EVENT_CANCELLED':
      return new ConflictException({
        code: refusal.code,
        message: 'Zrušenou akci nejde upravit.',
      });
    case 'EVENT_STARTED':
      // B-028: changing a started event is a 400
      return new BadRequestException(['Akce už začala, upravit ji nejde.']);
    case 'INVALID_CAPACITY':
      return new BadRequestException([refusal.problem]);
  }
};

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
    if (!viewerId)
      return { ...event, participants: null, myParticipation: null };
    const [participants, mine] = await Promise.all([
      this.eventRepository.findApprovedParticipants(event.id),
      this.eventRepository.findParticipationStatus(event.id, viewerId),
    ]);
    // someone who withdrew is simply not in
    const myParticipation = !mine || mine === 'withdrawn' ? null : mine;
    return { ...event, participants, myParticipation };
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
      // shown as they are in the form, so in Czech (like the groups service)
      throw new BadRequestException(['Termín musí být v budoucnosti.']);
    }
    const refs = await this.eventRepository.catalogRefsExist(
      event.activityId,
      event.localityId,
    );
    const problems = [
      refs.activity ? null : 'Neznámá aktivita.',
      refs.locality ? null : 'Neznámá lokalita.',
    ].filter((problem): problem is string => problem !== null);
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }

    const id = await this.eventRepository.createEvent(event, organizerId);
    return this.getEventDetail(id, organizerId, now);
  }

  /**
   * The organizer cancels the event, with a reason (B-028, #52). The event is
   * not deleted: it leaves the list and the map, and its detail stays
   * reachable with the „Zrušeno“ label. The app never cancels on its own,
   * not even when the minimum isn't reached.
   */
  async cancelEvent(
    id: string,
    userId: string,
    reason: string,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    const event = await this.getEventDetail(id, userId, now); // 404 first
    if (event.organizer.id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_ORGANIZER',
        message: 'Akci může zrušit jen její organizátor.',
      });
    }
    this.assertCancellable(event, now);
    if (!(await this.eventRepository.cancelEvent(id, reason, now))) {
      // changed between the check and the write (e.g. cancelled in another tab)
      this.assertCancellable(await this.getEventDetail(id, userId, now), now);
    }
    return this.getEventDetail(id, userId, now);
  }

  /**
   * The organizer changes the event (B-028, #41), until it starts. The
   * maximum can't go below the people who already have a place, and the end
   * moves with the start; the activity and the way of joining can't change
   * at all (the DTO doesn't take them).
   */
  async updateEvent(
    id: string,
    userId: string,
    changes: EventChanges,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    const event = await this.getEventDetail(id, userId, now); // 404 first
    if (event.organizer.id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_ORGANIZER',
        message: 'Upravit akci může jen její organizátor.',
      });
    }
    // fail fast, before the field checks; checked again under the lock
    const refusal = lifecycleRefusal(event, now);
    if (refusal) throw updateRefused(refusal);
    if (changes.startsAt && changes.startsAt <= now) {
      throw new BadRequestException(['Termín musí být v budoucnosti.']);
    }
    if (changes.localityId) {
      const refs = await this.eventRepository.catalogRefsExist(
        event.activity.id,
        changes.localityId,
      );
      if (!refs.locality) throw new BadRequestException(['Neznámá lokalita.']);
    }
    const decision = await this.eventRepository.updateEvent(id, (state) =>
      decideUpdate(state, changes, now),
    );
    if (!decision) throw new NotFoundException('Event not found');
    if (!decision.ok) throw updateRefused(decision.refusal);
    return this.getEventDetail(id, userId, now);
  }

  private assertCancellable(event: EventDetail, now: Date): void {
    if (event.status === 'cancelled') {
      throw new ConflictException({
        code: 'EVENT_CANCELLED',
        message: 'Akce už je zrušená.',
      });
    }
    if (event.startsAt <= now) {
      throw new ConflictException({
        code: 'EVENT_STARTED',
        message: 'Akce už začala, zrušit ji nejde.',
      });
    }
  }

  /**
   * Joins the event (B-031): at once without approval, and the organizer
   * always; with approval as a request (#53). Refusals are 409 with a code.
   * Returns the detail as the user now sees it.
   */
  async join(
    eventId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    await this.getEventDetail(eventId, userId, now); // 404 if the user can't see it
    const decision = await this.eventRepository.join(eventId, userId, (state) =>
      decideJoin(state, now),
    );
    if (!decision) throw new NotFoundException('Event not found');
    if (!decision.ok) throw refused(decision.refusal);
    return this.getEventDetail(eventId, userId, now);
  }

  /** Leaves the event or withdraws a request, before it starts; the place is free again. */
  async leave(
    eventId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    await this.getEventDetail(eventId, userId, now);
    const decision = await this.eventRepository.leave(
      eventId,
      userId,
      (state) => decideLeave(state, now),
    );
    if (!decision) throw new NotFoundException('Event not found');
    if (!decision.ok) throw refused(decision.refusal);
    return this.getEventDetail(eventId, userId, now);
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
