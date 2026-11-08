import { matchesCapacity } from '@/modules/event/domain/capacity';
import { distanceKm, GeoPoint } from '@/modules/event/domain/distance';
import {
  EventChanges,
  EventDetail,
  EventDetailView,
  EventManagementView,
  GroupEvents,
  MyEvent,
  MyEventsTab,
  NewEvent,
  PublicEvent,
  PublicEventFilters,
  PublicEventSort,
} from '@/modules/event/domain/event';
import { matchesSearch } from '@/modules/event/domain/event-search';
import {
  canReadMessages,
  canSendMessages,
  decideMessage,
  EventMessage,
  EventMessages,
  MessageInput,
  MessageRefusal,
  MESSAGES_SHOWN,
  remainingMessages,
} from '@/modules/event/domain/event-message';
import {
  decideUpdate,
  lifecycleRefusal,
  UpdateRefusal,
} from '@/modules/event/domain/event-update';
import {
  canManageEvent,
  EventViewer,
} from '@/modules/event/domain/event-viewer';
import { rankByInterest } from '@/modules/event/domain/interest';
import { canSeeParticipants } from '@/modules/event/domain/participant-visibility';
import {
  decideJoin,
  decideLeave,
  decideRequests,
  ParticipationRefusal,
  type ParticipationStatus,
} from '@/modules/event/domain/participation';
import { startOfPragueDayOf } from '@/modules/event/domain/prague-day';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { summarizeChange } from '@/modules/notification/domain/event-change';
import { NotificationService } from '@/modules/notification/services/notification.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/** Shown as they are in the app (409 with the code). */
const REFUSAL_MESSAGES: Record<ParticipationRefusal, string> = {
  EVENT_FULL: 'Akce je plná.',
  ALREADY_JOINED: 'Na akci už máš místo nebo žádost.',
  EVENT_STARTED: 'Akce už začala.',
  EVENT_CANCELLED: 'Akce je zrušená.',
  // rejected or removed; neutral, as the organizer may be a woman
  PARTICIPATION_REFUSED: 'Na akci se už přihlásit nemůžeš.',
  NOT_JOINED: 'Na akci nemáš místo ani žádost.',
  NOT_PENDING: 'Žádost už není aktuální: mezitím byla vyřízená, nebo stažená.',
};

const groupInactive = (): ConflictException =>
  new ConflictException({
    code: 'GROUP_INACTIVE',
    message: 'Skupina už není aktivní.',
  });

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
    case 'INVALID_END':
      return new BadRequestException([refusal.problem]);
  }
};

const messageRefused = (refusal: MessageRefusal): HttpException =>
  refusal === 'EVENT_CANCELLED'
    ? new ConflictException({
        code: refusal,
        message: 'Zrušené akci už zprávu poslat nejde.',
      })
    : new HttpException(
        {
          code: refusal,
          message: 'Dnes už k akci další zprávu poslat nemůžeš. Zkus to zítra.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

// One endpoint serves both the list and the map in sprint 2, without paging
// (deviation from B-023, which has paging and a separate /events/map).
export const PUBLIC_EVENTS_LIMIT = 200;
// Safety cap for the capacity filter and the popular order, which have to load
// events before filtering or ranking them. The endpoint is public, so the
// query must stay bounded however many events exist.
export const SCAN_LIMIT = 2000;
export const MY_EVENTS_LIMIT = 200;

/** Each event's distance from the point, to one decimal (#57); unchanged without a point. */
const withDistance = (
  events: PublicEvent[],
  point: GeoPoint | undefined,
): PublicEvent[] =>
  point
    ? events.map((event) => ({
        ...event,
        distanceKm: Math.round(distanceKm(point, event) * 10) / 10,
      }))
    : events;

/** Nearest first; equally far soonest first (the input is soonest first, the sort is stable). */
const byDistance = (events: PublicEvent[]): PublicEvent[] =>
  [...events].sort(
    (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  );
// Per section of a group's page; the endpoint is public, so it stays bounded.
export const GROUP_EVENTS_LIMIT = 50;

@Injectable()
export class EventsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Upcoming public events matching the filters, at most `limit`: soonest
   * first, or with `popular` the most interest first (#156).
   */
  async getPublicEvents(
    filters: PublicEventFilters,
    {
      sort = 'date',
      limit = PUBLIC_EVENTS_LIMIT,
    }: { sort?: PublicEventSort; limit?: number } = {},
    now: Date = new Date(),
  ): Promise<PublicEvent[]> {
    const { capacity, q, point, radiusKm } = filters;
    const isSearch = Boolean(q?.trim());
    if (!capacity && !isSearch && !radiusKm && sort === 'date') {
      const events = await this.eventRepository.findPublicEvents({
        filters,
        now,
        limit,
      });
      return withDistance(events, point);
    }
    // The capacity filter compares approved participations with the minimum and
    // maximum, interest counts waiting requests too, the search ignores
    // diacritics and the circle needs the exact distance (#57); the event query
    // can do none of it. Filter and rank first, then cut, or matching, popular
    // and near events could fall behind the limit.
    const [events, interest] = await Promise.all([
      this.eventRepository.findPublicEvents({
        filters,
        now,
        limit: SCAN_LIMIT,
      }),
      sort === 'popular'
        ? this.eventRepository.countInterest(filters, now)
        : null,
    ]);
    const matching = withDistance(events, point).filter(
      (event) =>
        (!capacity || matchesCapacity(event.capacity, capacity)) &&
        (!isSearch || matchesSearch(event, q!)) &&
        (!radiusKm ||
          (event.distanceKm !== null && event.distanceKm <= radiusKm)),
    );
    const ordered = interest
      ? rankByInterest(matching, interest)
      : sort === 'distance'
        ? byDistance(matching)
        : matching;
    return ordered.slice(0, limit);
  }

  /**
   * A tab of „Moje akce“ (B-035), soonest first. Personal lists stay short;
   * the limit only bounds the query.
   */
  async getMyEvents(
    userId: string,
    tab: MyEventsTab,
    now: Date = new Date(),
  ): Promise<MyEvent[]> {
    return this.eventRepository.findMyEvents({
      tab,
      userId,
      now,
      limit: MY_EVENTS_LIMIT,
    });
  }

  /**
   * A group's upcoming and past events for its page (B-055, Figma A-08e),
   * for visitors too. Members-only events only for an active member or
   * admin; `viewerId` is the session's user.
   */
  async getGroupEvents(
    groupId: string,
    viewerId: string | null,
    now: Date = new Date(),
  ): Promise<GroupEvents> {
    const includeMembersOnly =
      viewerId !== null &&
      (await this.eventRepository.findActiveGroupRole(groupId, viewerId)) !==
        null;
    const query = {
      groupId,
      includeMembersOnly,
      now,
      limit: GROUP_EVENTS_LIMIT,
    };
    const [upcoming, past] = await Promise.all([
      this.eventRepository.findGroupEvents({ ...query, when: 'upcoming' }),
      this.eventRepository.findGroupEvents({ ...query, when: 'past' }),
    ]);
    return { upcoming, past };
  }

  /**
   * One event for its detail page (B-026), for visitors too: a shared link
   * opens without signing in. Unknown, hidden and deleted events are 404.
   * A members-only event is 401 for a visitor, who signs in and comes back,
   * and 403 MEMBERS_ONLY with just the `groupId` for a signed-in user outside
   * the group, so the app can show the way into the group (A-05i, review
   * #215): nothing else about the event leaves.
   *
   * The names of who is coming go only to the organizer, an approved
   * participant and the group's members and admins (#174); everyone else
   * gets `participants: null` and sees the occupancy. `canManage` tells the
   * organizer and the group's admins apart (B-055). `viewerId` is always
   * the session's user, never something from the request.
   */
  async getEventDetail(
    id: string,
    viewerId: string | null,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    const { event, viewer } = await this.findVisibleEvent(id, viewerId, now);
    const participants = canSeeParticipants(viewer)
      ? await this.eventRepository.findApprovedParticipants(event.id)
      : null;
    // someone who withdrew is simply not in
    const mine = viewer?.participation ?? null;
    const myParticipation = mine === 'withdrawn' ? null : mine;
    return {
      ...event,
      participants,
      myParticipation,
      viewerSignedIn: viewer !== null,
      canManage: canManageEvent(viewer),
    };
  }

  /**
   * The event's messages from its organizer (#176), newest first, for
   * whoever sees „Kdo jde“ (#174); anyone else gets 403. The organizer of a
   * published event also learns how many they may still send today. A
   * cancelled event's messages stay readable.
   */
  async getMessages(
    eventId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<EventMessages> {
    const { event, viewer } = await this.findVisibleEvent(eventId, userId, now);
    if (!canReadMessages(viewer)) {
      throw new ForbiddenException({
        code: 'NOT_PARTICIPANT',
        message: 'Zprávy od organizátora vidí jen ti, kdo na akci jdou.',
      });
    }
    const [messages, total, remainingToday] = await Promise.all([
      this.eventRepository.findMessages(eventId, MESSAGES_SHOWN),
      this.eventRepository.countMessages(eventId),
      canSendMessages(event, viewer)
        ? this.eventRepository
            .countMessagesSince(eventId, startOfPragueDayOf(now))
            .then(remainingMessages)
        : null,
    ]);
    return { messages, total, remainingToday };
  }

  /**
   * „Napsat účastníkům“ (B-042, #176, Figma D-04): only the organizer of a
   * published event, at most MESSAGES_PER_DAY in a Prague calendar day.
   * Every approved participant gets it by e-mail, not the organizer.
   */
  async sendMessage(
    eventId: string,
    userId: string,
    input: MessageInput,
    now: Date = new Date(),
  ): Promise<EventMessage> {
    // 404, or 403 MEMBERS_ONLY for a members-only event outside the group
    const { event, viewer } = await this.findVisibleEvent(eventId, userId, now);
    if (!viewer?.isOrganizer) {
      throw new ForbiddenException({
        code: 'NOT_ORGANIZER',
        message: 'Účastníkům může napsat jen organizátor akce.',
      });
    }
    // fail fast; checked again under the lock
    if (!canSendMessages(event, viewer))
      throw messageRefused('EVENT_CANCELLED');
    const result = await this.eventRepository.createMessage(
      eventId,
      userId,
      input,
      startOfPragueDayOf(now),
      decideMessage,
    );
    if (!result) throw new NotFoundException('Akce neexistuje.');
    if (!result.ok) throw messageRefused(result.refusal);
    // after the write: the participants get the e-mail, the organizer doesn't wait for it
    this.notifications.notify({
      type: 'event-message',
      eventId,
      messageId: result.message.id,
    });
    return result.message;
  }

  /**
   * Creates an event of the signed-in user (B-021). The organizer is always
   * `organizerId` from the session, never something from the request body.
   * A group's event (B-055) is created by any active admin of an active
   * group, with the group's activity; only it may be members-only.
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
    await this.assertCanCreateFor(event, organizerId);

    const id = await this.eventRepository.createEvent(event, organizerId);
    // deactivated between the check and the write (e.g. in another tab)
    if (id === null) throw groupInactive();
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
    const event = await this.getEventDetail(id, userId, now); // 404 or MEMBERS_ONLY first
    this.assertCanManage(event, 'Akci může zrušit jen její organizátor.');
    this.assertCancellable(event, now);
    if (await this.eventRepository.cancelEvent(id, reason, now)) {
      // only the cancel that wrote tells the participants (#177)
      this.notifications.notify({ type: 'event-cancelled', eventId: id });
    } else {
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
    const event = await this.getEventDetail(id, userId, now); // 404 or MEMBERS_ONLY first
    this.assertCanManage(event, 'Upravit akci může jen její organizátor.');
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
    if (!decision) throw new NotFoundException('Akce neexistuje.');
    if (!decision.ok) throw updateRefused(decision.refusal);
    const updated = await this.getEventDetail(id, userId, now);
    // a new title or a higher maximum is nobody's news; time and place are (#177)
    const change = summarizeChange(event, updated);
    if (change) {
      this.notifications.notify({
        type: 'event-changed',
        eventId: id,
        change,
      });
    }
    return updated;
  }

  /**
   * Who is in and who is waiting, for the organizer's management page
   * (B-033, #43, #53); anyone else gets 403. A cancelled or past event too:
   * the organizer may still want to know who was coming.
   */
  async getParticipants(
    eventId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<EventManagementView> {
    const event = await this.getEventDetail(eventId, userId, now); // 404 or MEMBERS_ONLY first
    this.assertCanManage(
      event,
      'Účastníky akce spravuje jen její organizátor.',
    );
    return {
      participants: event.participants ?? [],
      requests: await this.eventRepository.findPendingRequests(eventId),
    };
  }

  /**
   * The organizer approves or rejects waiting requests (B-033, #53), all of
   * them or none: approving past the free places is 409 EVENT_FULL and
   * changes nothing. Returns the management lists as they are now.
   */
  async decideRequests(
    eventId: string,
    userId: string,
    requesterIds: string[],
    decision: 'approve' | 'reject',
    now: Date = new Date(),
  ): Promise<EventManagementView> {
    const event = await this.getEventDetail(eventId, userId, now); // 404 or MEMBERS_ONLY first
    this.assertCanManage(
      event,
      'Žádosti o účast vyřizuje jen organizátor akce.',
    );
    const result = await this.eventRepository.decideRequests(
      eventId,
      [...new Set(requesterIds)],
      decision === 'approve' ? 'approved' : 'rejected',
      (state) => decideRequests(state, decision, now),
      now,
    );
    if (!result) throw new NotFoundException('Akce neexistuje.');
    if (!result.ok) throw refused(result.refusal);
    this.notifications.notify({
      type: 'request-decided',
      eventId,
      userIds: [...new Set(requesterIds)],
      outcome: decision === 'approve' ? 'approved' : 'rejected',
    });
    return this.getParticipants(eventId, userId, now);
  }

  /**
   * The organizer, or for a group's event any of its admins (B-055); the
   * message speaks of the organizer, which a group's event has in the group.
   */
  private assertCanManage(event: EventDetailView, message: string): void {
    if (!event.canManage) {
      throw new ForbiddenException({ code: 'NOT_ORGANIZER', message });
    }
  }

  private async assertCanCreateFor(
    event: NewEvent,
    userId: string,
  ): Promise<void> {
    if (!event.groupId) {
      if (event.visibility === 'members') {
        throw new BadRequestException([
          'Jen pro členy může být jen akce skupiny.',
        ]);
      }
      return;
    }
    const group = await this.eventRepository.findGroupForEvent(
      event.groupId,
      userId,
    );
    if (!group) throw new BadRequestException(['Neznámá skupina.']);
    // fail fast; checked again under the group's lock when writing
    if (group.status !== 'active') throw groupInactive();
    if (group.role !== 'admin') {
      throw new ForbiddenException({
        code: 'NOT_GROUP_ADMIN',
        message: 'Akci skupiny zakládá jen její správce.',
      });
    }
    // the form locks the activity to the group's; the server holds to it too
    if (event.activityId !== group.activityId) {
      throw new BadRequestException(['Akce skupiny má aktivitu skupiny.']);
    }
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
    message: string | null = null,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    // 404, or 403 MEMBERS_ONLY for a members-only event outside the group
    await this.getEventDetail(eventId, userId, now);
    const decision = await this.eventRepository.join(
      eventId,
      userId,
      message,
      (state) => decideJoin(state, now),
    );
    if (!decision) throw new NotFoundException('Akce neexistuje.');
    if (!decision.ok) throw refused(decision.refusal);
    // a request waits for the organizer, who hears of it (#177); joining at once has nobody to tell
    if (decision.status === 'pending') {
      this.notifications.notify({
        type: 'request-received',
        eventId,
        applicantId: userId,
        message,
      });
    }
    return this.getEventDetail(eventId, userId, now);
  }

  /**
   * Leaves the event or withdraws a request, before it starts; the place is
   * free again. The organizer hears of a participant leaving (#177), not of a
   * request being withdrawn: that one just disappears from their list.
   */
  async leave(
    eventId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<EventDetailView> {
    await this.getEventDetail(eventId, userId, now);
    // the status read under the row lock: an approval just before leaving
    // still tells the organizer
    let leftStatus: ParticipationStatus | null = null;
    const decision = await this.eventRepository.leave(
      eventId,
      userId,
      (state) => {
        leftStatus = state.existingStatus;
        return decideLeave(state, now);
      },
    );
    if (!decision) throw new NotFoundException('Akce neexistuje.');
    if (!decision.ok) throw refused(decision.refusal);
    if (leftStatus === 'approved') {
      this.notifications.notify({
        type: 'participant-left',
        eventId,
        participantId: userId,
      });
    }
    return this.getEventDetail(eventId, userId, now);
  }

  /**
   * The event and who is looking at it, once the viewer may see it at all:
   * unknown, hidden and deleted events are 404, a members-only event outside
   * the group 401/403 (see `getEventDetail`). Who the viewer is comes first,
   * before the 404 decision: one membership lookup serves both canView and
   * what the viewer may see. Keep the two together.
   */
  private async findVisibleEvent(
    id: string,
    viewerId: string | null,
    now: Date,
  ): Promise<{ event: EventDetail; viewer: EventViewer }> {
    const event = await this.eventRepository.findEventDetail(id, now);
    // a cancelled event stays reachable, with its reason (#52)
    if (!event || event.status === 'hidden' || event.status === 'deleted') {
      throw new NotFoundException('Akce neexistuje.');
    }
    const viewer = viewerId ? await this.viewerOf(event, viewerId) : null;
    if (!this.canView(event, viewer)) {
      throw this.membersOnly(event, viewer);
    }
    return { event, viewer };
  }

  /**
   * What the server knows about a signed-in viewer of the event. The group's
   * status doesn't count, on purpose (review #264): a deactivated group's
   * members still see its members-only events, past ones are their history
   * (Figma A-08), and its admins still manage them, which changes nothing
   * once the upcoming ones are cancelled.
   */
  private async viewerOf(
    event: EventDetail,
    viewerId: string,
  ): Promise<NonNullable<EventViewer>> {
    const isOrganizer = event.organizer.id === viewerId;
    const [participation, groupRole] = await Promise.all([
      this.eventRepository.findParticipationStatus(event.id, viewerId),
      // pending and blocked members have no role here
      event.group && !isOrganizer
        ? this.eventRepository.findActiveGroupRole(event.group.id, viewerId)
        : null,
    ]);
    return {
      isOrganizer,
      participation,
      // admins are active members too
      isGroupMember: groupRole !== null,
      isGroupAdmin: groupRole === 'admin',
    };
  }

  private membersOnly(event: EventDetail, viewer: EventViewer): HttpException {
    // a members-only event always has a group; without one it is nobody's
    if (!event.group) return new NotFoundException('Akce neexistuje.');
    if (!viewer) {
      return new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Akce je jen pro členy skupiny. Přihlas se.',
      });
    }
    return new ForbiddenException({
      code: 'MEMBERS_ONLY',
      message: 'Akce je jen pro členy skupiny.',
      groupId: event.group.id,
    });
  }

  private canView(event: EventDetail, viewer: EventViewer): boolean {
    // a private event is reachable by anyone with the link
    if (event.visibility !== 'members') return true;
    return viewer !== null && (viewer.isOrganizer || viewer.isGroupMember);
  }
}
