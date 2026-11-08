import { computeCapacity } from '@/modules/event/domain/capacity';
import {
  EventDetail,
  NewEvent,
  PublicEvent,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import {
  EventsService,
  GROUP_EVENTS_LIMIT,
  MY_EVENTS_LIMIT,
  PUBLIC_EVENTS_LIMIT,
  SCAN_LIMIT,
} from './events.service';

const now = new Date('2026-10-23T08:00:00.000Z');

const anEvent = (id: string, approvedCount: number): PublicEvent => ({
  id,
  title: `Akce ${id}`,
  summary: null,
  startsAt: new Date('2026-10-24T16:00:00.000Z'),
  endsAt: null,
  address: 'Herna Karlín, Křižíkova 52, Praha 8',
  lat: 50.0928,
  lng: 14.4508,
  activity: {
    id: 'a-deskove-hry',
    slug: 'deskove-hry',
    name: 'Deskové hry',
    category: { id: 'c-hry', slug: 'hry', name: 'Hry', icon: 'dice' },
  },
  locality: { id: 'l-praha-8', slug: 'praha-8', name: 'Praha 8' },
  organizer: { id: 'u1', name: 'Petra' },
  group: null,
  minParticipants: 3,
  maxParticipants: 6,
  capacity: computeCapacity(
    { minParticipants: 3, maxParticipants: 6 },
    approvedCount,
  ),
  isPromoted: false,
});

describe('EventsService', () => {
  it('passes the filters to the repository with the limit', async () => {
    const repository = mock<EventRepository>();
    const events = [anEvent('e1', 2)];
    repository.findPublicEvents.mockResolvedValue(events);

    const service = new EventsService(repository);
    const filters = { localityId: 'l-praha', dateFrom: '2026-10-24' };

    await expect(service.getPublicEvents(filters, {}, now)).resolves.toEqual(
      events,
    );
    expect(repository.findPublicEvents).toHaveBeenCalledWith({
      filters,
      now,
      limit: PUBLIC_EVENTS_LIMIT,
    });
  });

  it('capacity=missing keeps only events that miss people to reach the minimum', async () => {
    const repository = mock<EventRepository>();
    repository.findPublicEvents.mockResolvedValue([
      anEvent('missing-one', 2),
      anEvent('at-minimum', 3),
      anEvent('nobody-yet', 0),
      anEvent('full', 6),
    ]);

    const service = new EventsService(repository);
    const result = await service.getPublicEvents(
      { capacity: 'missing' },
      {},
      now,
    );

    expect(result.map((event) => event.id)).toEqual([
      'missing-one',
      'nobody-yet',
    ]);
  });

  it('capacity=free hides only full events', async () => {
    const repository = mock<EventRepository>();
    repository.findPublicEvents.mockResolvedValue([
      anEvent('missing-one', 2),
      anEvent('at-minimum', 3),
      anEvent('one-place-left', 5),
      anEvent('full', 6),
    ]);

    const service = new EventsService(repository);
    const result = await service.getPublicEvents({ capacity: 'free' }, {}, now);

    expect(result.map((event) => event.id)).toEqual([
      'missing-one',
      'at-minimum',
      'one-place-left',
    ]);
  });

  it('the capacity filter applies before the limit, so matches are not cut off', async () => {
    const repository = mock<EventRepository>();
    const complete = Array.from({ length: PUBLIC_EVENTS_LIMIT }, (_, i) =>
      anEvent(`complete-${i}`, 3),
    );
    const missing = Array.from({ length: PUBLIC_EVENTS_LIMIT + 5 }, (_, i) =>
      anEvent(`missing-${i}`, 1),
    );
    repository.findPublicEvents.mockResolvedValue([...complete, ...missing]);

    const service = new EventsService(repository);
    const result = await service.getPublicEvents(
      { capacity: 'missing' },
      {},
      now,
    );

    expect(repository.findPublicEvents).toHaveBeenCalledWith({
      filters: { capacity: 'missing' },
      now,
      limit: SCAN_LIMIT,
    });
    expect(result).toHaveLength(PUBLIC_EVENTS_LIMIT);
    expect(result.every((event) => event.id.startsWith('missing-'))).toBe(true);
  });

  it('a limit cuts the soonest events in the database and counts no interest', async () => {
    const repository = mock<EventRepository>();
    repository.findPublicEvents.mockResolvedValue([anEvent('e1', 2)]);

    const service = new EventsService(repository);
    await service.getPublicEvents({}, { limit: 6 }, now);

    expect(repository.findPublicEvents).toHaveBeenCalledWith({
      filters: {},
      now,
      limit: 6,
    });
    expect(repository.countInterest).not.toHaveBeenCalled();
  });

  describe('sort=popular (#156)', () => {
    it('ranks every visible event by interest before the limit, so a later busy event is not cut off', async () => {
      const repository = mock<EventRepository>();
      // the repository answers soonest first
      repository.findPublicEvents.mockResolvedValue(
        ['e1', 'e2', 'e3', 'e4', 'e5'].map((id) => anEvent(id, 1)),
      );
      repository.countInterest.mockResolvedValue(
        new Map([
          ['e1', 1],
          ['e3', 4],
          ['e5', 9],
        ]),
      );
      const filters = { localityId: 'l-praha' };

      const service = new EventsService(repository);
      const result = await service.getPublicEvents(
        filters,
        { sort: 'popular', limit: 3 },
        now,
      );

      expect(result.map((event) => event.id)).toEqual(['e5', 'e3', 'e1']);
      expect(repository.findPublicEvents).toHaveBeenCalledWith({
        filters,
        now,
        limit: SCAN_LIMIT,
      });
      expect(repository.countInterest).toHaveBeenCalledWith(filters, now);
    });

    it('with a capacity filter ranks only the matching events', async () => {
      const repository = mock<EventRepository>();
      repository.findPublicEvents.mockResolvedValue([
        anEvent('full', 6),
        anEvent('one-place-left', 5),
        anEvent('free', 2),
      ]);
      repository.countInterest.mockResolvedValue(
        new Map([
          ['full', 8],
          ['one-place-left', 5],
          ['free', 6],
        ]),
      );

      const service = new EventsService(repository);
      const result = await service.getPublicEvents(
        { capacity: 'free' },
        { sort: 'popular' },
        now,
      );

      expect(result.map((event) => event.id)).toEqual([
        'free',
        'one-place-left',
      ]);
    });
  });
});

const aDetail = (overrides: Partial<EventDetail> = {}): EventDetail => ({
  ...anEvent('e1', 2),
  description: 'Hrajeme Carcassonne a Azul, hry půjčíme.',
  approvalMode: 'open',
  visibility: 'public',
  status: 'published',
  cancelReason: null,
  ...overrides,
});

// someone else (u1) created it; u9 is in the group
const groupEventDetail = (): EventDetail =>
  aDetail({ group: { id: 'g1', name: 'Deskovkáři Karlín' } });

const participants = [
  { id: 'u2', name: 'Jana' },
  { id: 'u3', name: 'Tomáš' },
];

describe('EventsService.getEventDetail', () => {
  const setup = (
    detail: EventDetail | null,
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    repository.findEventDetail.mockResolvedValue(detail);
    repository.findApprovedParticipants.mockResolvedValue(participants);
    repository.findParticipationStatus.mockResolvedValue(null);
    repository.findActiveGroupRole.mockResolvedValue(null);
    return { repository, service: new EventsService(repository) };
  };

  it('a visitor gets the count, not the names', async () => {
    const { repository, service } = setup(aDetail());

    const result = await service.getEventDetail('e1', null, now);

    expect(result.capacity.approvedCount).toBe(2);
    expect(result.participants).toBeNull();
    expect(result.viewerSignedIn).toBe(false);
    expect(repository.findApprovedParticipants).not.toHaveBeenCalled();
    expect(repository.findEventDetail).toHaveBeenCalledWith('e1', now);
  });

  describe('who gets the names (#174)', () => {
    const groupEvent = (): EventDetail =>
      aDetail({ group: { id: 'g1', name: 'Deskovkáři Karlín' } });

    it('the organizer, without a place of their own', async () => {
      const { repository, service } = setup(aDetail());

      const result = await service.getEventDetail('e1', 'u1', now);

      expect(result.participants).toEqual(participants);
      expect(result.capacity.approvedCount).toBe(2);
      expect(repository.findApprovedParticipants).toHaveBeenCalledWith('e1');
    });

    it('an approved participant', async () => {
      const { repository, service } = setup(aDetail());
      repository.findParticipationStatus.mockResolvedValue('approved');

      const result = await service.getEventDetail('e1', 'u9', now);

      expect(result.participants).toEqual(participants);
      expect(result.myParticipation).toBe('approved');
      expect(repository.findParticipationStatus).toHaveBeenCalledWith(
        'e1',
        'u9',
      );
    });

    it('a signed-in user without a place does not get them', async () => {
      const { repository, service } = setup(aDetail());

      const result = await service.getEventDetail('e1', 'u9', now);

      expect(result.participants).toBeNull();
      // still told apart from a visitor, so the app doesn't take it for an expired session
      expect(result.viewerSignedIn).toBe(true);
      expect(result.capacity.approvedCount).toBe(2);
      expect(result.capacity.missingToMin).toBe(1);
      expect(repository.findApprovedParticipants).not.toHaveBeenCalled();
    });

    it('not a waiting applicant', async () => {
      const { repository, service } = setup(aDetail());
      repository.findParticipationStatus.mockResolvedValue('pending');

      const result = await service.getEventDetail('e1', 'u9', now);

      expect(result.participants).toBeNull();
      expect(result.myParticipation).toBe('pending');
      expect(repository.findApprovedParticipants).not.toHaveBeenCalled();
    });

    it.each(['withdrawn', 'removed', 'rejected'] as const)(
      'not a %s participant',
      async (status) => {
        const { repository, service } = setup(aDetail());
        repository.findParticipationStatus.mockResolvedValue(status);

        const result = await service.getEventDetail('e1', 'u9', now);

        expect(result.participants).toBeNull();
        expect(repository.findApprovedParticipants).not.toHaveBeenCalled();
      },
    );

    it.each(['member', 'admin'] as const)(
      "an active %s of the event's group, without a place",
      async (role) => {
        const { repository, service } = setup(groupEvent());
        repository.findActiveGroupRole.mockResolvedValue(role);

        const result = await service.getEventDetail('e1', 'u9', now);

        expect(result.participants).toEqual(participants);
        expect(repository.findActiveGroupRole).toHaveBeenCalledWith('g1', 'u9');
      },
    );

    it("not a pending, blocked or former member of the event's group", async () => {
      const { repository, service } = setup(groupEvent());
      repository.findActiveGroupRole.mockResolvedValue(null);

      const result = await service.getEventDetail('e1', 'u9', now);

      expect(result.participants).toBeNull();
      expect(repository.findApprovedParticipants).not.toHaveBeenCalled();
    });

    it('not a visitor of a group event, and the group is not looked up', async () => {
      const { repository, service } = setup(groupEvent());

      const result = await service.getEventDetail('e1', null, now);

      expect(result.participants).toBeNull();
      expect(repository.findActiveGroupRole).not.toHaveBeenCalled();
      expect(repository.findParticipationStatus).not.toHaveBeenCalled();
    });

    it('a full event shows a visitor it is full, without the names', async () => {
      const { service } = setup(
        aDetail({
          capacity: computeCapacity(
            { minParticipants: 3, maxParticipants: 6 },
            6,
          ),
        }),
      );

      const result = await service.getEventDetail('e1', null, now);

      expect(result.participants).toBeNull();
      expect(result.capacity).toMatchObject({ approvedCount: 6, isFull: true });
    });
  });

  it('an unknown event is 404', async () => {
    const { service } = setup(null);

    await expect(service.getEventDetail('nope', null, now)).rejects.toThrow(
      NotFoundException,
    );
  });

  it.each(['hidden', 'deleted'] as const)(
    'a %s event is 404, even for its organizer',
    async (status) => {
      const { service } = setup(aDetail({ status }));

      await expect(service.getEventDetail('e1', 'u1', now)).rejects.toThrow(
        NotFoundException,
      );
    },
  );

  it('a cancelled event is returned with its reason', async () => {
    const { service } = setup(
      aDetail({ status: 'cancelled', cancelReason: 'Herna má zavřeno' }),
    );

    await expect(
      service.getEventDetail('e1', null, now),
    ).resolves.toMatchObject({
      status: 'cancelled',
      cancelReason: 'Herna má zavřeno',
    });
  });

  it('a private event is open to anyone with the link, visitors included', async () => {
    const { service } = setup(aDetail({ visibility: 'private' }));

    await expect(
      service.getEventDetail('e1', null, now),
    ).resolves.toMatchObject({ id: 'e1', visibility: 'private' });
  });

  describe('a members-only event', () => {
    const membersOnly = (): EventDetail =>
      aDetail({
        visibility: 'members',
        group: { id: 'g1', name: 'Deskovkáři Karlín' },
      });

    it('is 401 UNAUTHENTICATED for a visitor, without the group', async () => {
      const { repository, service } = setup(membersOnly());

      const error = (await service
        .getEventDetail('e1', null, now)
        .catch((e: unknown) => e)) as UnauthorizedException;

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.getResponse()).toEqual({
        code: 'UNAUTHENTICATED',
        message: expect.any(String),
      });
      expect(repository.findActiveGroupRole).not.toHaveBeenCalled();
    });

    it('is 403 MEMBERS_ONLY with only the groupId for a signed-in user outside the group', async () => {
      const { repository, service } = setup(membersOnly());

      const error = (await service
        .getEventDetail('e1', 'u9', now)
        .catch((e: unknown) => e)) as ForbiddenException;

      expect(error).toBeInstanceOf(ForbiddenException);
      // nothing about the event itself (B-026, review #215)
      expect(error.getResponse()).toEqual({
        code: 'MEMBERS_ONLY',
        message: expect.any(String),
        groupId: 'g1',
      });
      expect(repository.findActiveGroupRole).toHaveBeenCalledWith('g1', 'u9');
    });

    it('is shown to an active member of the group, with the names', async () => {
      const { repository, service } = setup(membersOnly());
      repository.findActiveGroupRole.mockResolvedValue('member');

      const result = await service.getEventDetail('e1', 'u9', now);

      expect(result.id).toBe('e1');
      expect(result.participants).toEqual(participants);
    });

    it('is shown to its organizer', async () => {
      const { repository, service } = setup(membersOnly());

      await expect(
        service.getEventDetail('e1', 'u1', now),
      ).resolves.toMatchObject({ id: 'e1' });
      expect(repository.findActiveGroupRole).not.toHaveBeenCalled();
    });

    it('without a group is 404 for anyone but its organizer', async () => {
      const { service } = setup(
        aDetail({ visibility: 'members', group: null }),
      );

      await expect(service.getEventDetail('e1', 'u9', now)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe('EventsService.createEvent', () => {
  const newEvent = (overrides: Partial<NewEvent> = {}): NewEvent => ({
    title: 'Deskovky po práci',
    description: null,
    activityId: 'a-deskove-hry',
    localityId: 'l-praha-8',
    lat: 50.0928,
    lng: 14.4508,
    address: 'Herna Karlín, Křižíkova 52, Praha 8',
    startsAt: new Date('2026-10-24T16:00:00.000Z'),
    endsAt: null,
    minParticipants: 3,
    maxParticipants: 6,
    approvalMode: 'open',
    groupId: null,
    visibility: 'public',
    ...overrides,
  });

  const setup = (
    refs = { activity: true, locality: true },
  ): {
    repository: MockProxy<EventRepository>;
    service: EventsService;
  } => {
    const repository = mock<EventRepository>();
    repository.catalogRefsExist.mockResolvedValue(refs);
    repository.createEvent.mockResolvedValue('e-new');
    repository.findEventDetail.mockResolvedValue(
      aDetail({ id: 'e-new', organizer: { id: 'u1', name: 'Petra' } }),
    );
    repository.findApprovedParticipants.mockResolvedValue([]);
    return { repository, service: new EventsService(repository) };
  };

  it('creates the event with the signed-in user as organizer and returns its detail', async () => {
    const { repository, service } = setup();
    const event = newEvent();

    const result = await service.createEvent(event, 'u1', now);

    expect(repository.createEvent).toHaveBeenCalledWith(event, 'u1');
    expect(result).toMatchObject({ id: 'e-new', organizer: { id: 'u1' } });
    // the organizer sees the new event as a signed-in user: names, not just a count
    expect(result.participants).toEqual([]);
  });

  it('a start in the past (or now) is 400 and nothing is created', async () => {
    const { repository, service } = setup();

    await expect(
      service.createEvent(newEvent({ startsAt: now }), 'u1', now),
    ).rejects.toThrow(BadRequestException);
    expect(repository.createEvent).not.toHaveBeenCalled();
  });

  it('an unknown activity or locality is 400 saying which, in Czech', async () => {
    const { repository, service } = setup({ activity: false, locality: true });

    const error = (await service
      .createEvent(newEvent(), 'u1', now)
      .catch((e: unknown) => e)) as BadRequestException;

    expect(error).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify(error.getResponse())).toContain('Neznámá aktivita.');
    expect(repository.createEvent).not.toHaveBeenCalled();
  });

  it("a person's own event cannot be members-only (400)", async () => {
    const { repository, service } = setup();

    await expect(
      service.createEvent(newEvent({ visibility: 'members' }), 'u1', now),
    ).rejects.toThrow(BadRequestException);
    expect(repository.createEvent).not.toHaveBeenCalled();
  });

  describe("a group's event (B-055)", () => {
    const groupEvent = (overrides: Partial<NewEvent> = {}): NewEvent =>
      newEvent({ groupId: 'g1', visibility: 'members', ...overrides });

    const group = {
      activityId: 'a-deskove-hry',
      status: 'active' as const,
      role: 'admin' as const,
    };

    it('an admin of the group creates it, members-only too', async () => {
      const { repository, service } = setup();
      repository.findGroupForEvent.mockResolvedValue(group);
      const event = groupEvent();

      await service.createEvent(event, 'u1', now);

      expect(repository.findGroupForEvent).toHaveBeenCalledWith('g1', 'u1');
      expect(repository.createEvent).toHaveBeenCalledWith(event, 'u1');
    });

    it.each([
      ['a regular member', 'member'],
      ['someone outside the group', null],
    ] as const)('%s gets 403 NOT_GROUP_ADMIN', async (_who, role) => {
      const { repository, service } = setup();
      repository.findGroupForEvent.mockResolvedValue({ ...group, role });

      const error = (await service
        .createEvent(groupEvent(), 'u9', now)
        .catch((e: unknown) => e)) as ForbiddenException;

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toMatchObject({ code: 'NOT_GROUP_ADMIN' });
      expect(repository.createEvent).not.toHaveBeenCalled();
    });

    it('a deactivated group is 409 GROUP_INACTIVE', async () => {
      const { repository, service } = setup();
      repository.findGroupForEvent.mockResolvedValue({
        ...group,
        status: 'inactive',
      });

      await expect(
        service.createEvent(groupEvent(), 'u1', now),
      ).rejects.toThrow(ConflictException);
      expect(repository.createEvent).not.toHaveBeenCalled();
    });

    it('a group deactivated between the check and the write is 409, not a published event (review #264)', async () => {
      const { repository, service } = setup();
      repository.findGroupForEvent.mockResolvedValue(group);
      repository.createEvent.mockResolvedValue(null);

      const error = (await service
        .createEvent(groupEvent(), 'u1', now)
        .catch((e: unknown) => e)) as ConflictException;

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({ code: 'GROUP_INACTIVE' });
      expect(repository.findEventDetail).not.toHaveBeenCalled();
    });

    it('an unknown group is 400', async () => {
      const { repository, service } = setup();
      repository.findGroupForEvent.mockResolvedValue(null);

      await expect(
        service.createEvent(groupEvent(), 'u1', now),
      ).rejects.toThrow(BadRequestException);
      expect(repository.createEvent).not.toHaveBeenCalled();
    });

    it("another activity than the group's is 400", async () => {
      const { repository, service } = setup();
      repository.findGroupForEvent.mockResolvedValue(group);

      await expect(
        service.createEvent(groupEvent({ activityId: 'a-sachy' }), 'u1', now),
      ).rejects.toThrow(BadRequestException);
      expect(repository.createEvent).not.toHaveBeenCalled();
    });
  });
});

describe('EventsService.cancelEvent', () => {
  const setup = (
    detail: EventDetail = aDetail(),
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    repository.findEventDetail.mockResolvedValue(detail);
    repository.findApprovedParticipants.mockResolvedValue(participants);
    repository.cancelEvent.mockResolvedValue(true);
    return { repository, service: new EventsService(repository) };
  };

  it('of two cancels at once, the one that lost the write gets 409', async () => {
    const { repository, service } = setup();
    repository.cancelEvent.mockResolvedValue(false);
    // re-read after the lost write: the other cancel got there first
    repository.findEventDetail
      .mockResolvedValueOnce(aDetail())
      .mockResolvedValue(aDetail({ status: 'cancelled' }));

    await expect(
      service.cancelEvent('e1', 'u1', 'Druhý pokus', now),
    ).rejects.toThrow(ConflictException);
  });

  it('the organizer cancels with the reason; the event is marked, not deleted', async () => {
    const { repository, service } = setup();

    await service.cancelEvent('e1', 'u1', 'Herna má zavřeno.', now);

    expect(repository.cancelEvent).toHaveBeenCalledWith(
      'e1',
      'Herna má zavřeno.',
      now,
    );
  });

  it('anyone else gets 403 and nothing changes', async () => {
    const { repository, service } = setup();

    await expect(
      service.cancelEvent('e1', 'u9', 'Nechci', now),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.cancelEvent).not.toHaveBeenCalled();
  });

  it("any admin of the event's group cancels it, not a regular member (B-055)", async () => {
    const admin = setup(groupEventDetail());
    admin.repository.findActiveGroupRole.mockResolvedValue('admin');
    await admin.service.cancelEvent('e1', 'u9', 'Herna má zavřeno.', now);
    expect(admin.repository.cancelEvent).toHaveBeenCalled();

    const member = setup(groupEventDetail());
    member.repository.findActiveGroupRole.mockResolvedValue('member');
    await expect(
      member.service.cancelEvent('e1', 'u9', 'Nechci', now),
    ).rejects.toThrow(ForbiddenException);
    expect(member.repository.cancelEvent).not.toHaveBeenCalled();
  });

  it('an already cancelled or started event is 409', async () => {
    const cancelled = setup(aDetail({ status: 'cancelled' }));
    await expect(
      cancelled.service.cancelEvent('e1', 'u1', 'Znovu', now),
    ).rejects.toThrow(ConflictException);

    const started = setup(aDetail({ startsAt: now }));
    await expect(
      started.service.cancelEvent('e1', 'u1', 'Pozdě', now),
    ).rejects.toThrow(ConflictException);
    expect(started.repository.cancelEvent).not.toHaveBeenCalled();
  });

  it('an event the user may not see is 404', async () => {
    const { repository, service } = setup(aDetail({ status: 'hidden' }));

    await expect(service.cancelEvent('e1', 'u1', 'Důvod', now)).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.cancelEvent).not.toHaveBeenCalled();
  });
});

describe('EventsService participation', () => {
  const setup = (
    detail: EventDetail = aDetail(),
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    repository.findEventDetail.mockResolvedValue(detail);
    repository.findApprovedParticipants.mockResolvedValue(participants);
    repository.findParticipationStatus.mockResolvedValue(null);
    repository.findActiveGroupRole.mockResolvedValue(null);
    return { repository, service: new EventsService(repository) };
  };

  it('the detail tells a signed-in user their own participation; a withdrawn one is none', async () => {
    const { repository, service } = setup();

    repository.findParticipationStatus.mockResolvedValue('approved');
    await expect(
      service.getEventDetail('e1', 'u9', now),
    ).resolves.toMatchObject({ myParticipation: 'approved' });

    repository.findParticipationStatus.mockResolvedValue('withdrawn');
    await expect(
      service.getEventDetail('e1', 'u9', now),
    ).resolves.toMatchObject({ myParticipation: null });

    await expect(
      service.getEventDetail('e1', null, now),
    ).resolves.toMatchObject({ myParticipation: null });
  });

  it('join decides with the rules at „now“ and returns the updated detail', async () => {
    const { repository, service } = setup();
    repository.join.mockImplementation(async (_e, _u, _m, decide) =>
      decide({
        eventStatus: 'published',
        startsAt: new Date('2026-10-24T16:00:00.000Z'),
        approvalMode: 'open',
        maxParticipants: 6,
        isOrganizer: false,
        existingStatus: null,
        approvedCount: 2,
      }),
    );
    repository.findParticipationStatus.mockResolvedValue('approved');

    const result = await service.join('e1', 'u9', 'Ahoj', now);

    expect(repository.join).toHaveBeenCalledWith(
      'e1',
      'u9',
      'Ahoj',
      expect.any(Function),
    );
    expect(result.myParticipation).toBe('approved');
  });

  it('a refusal is 409 with its code and a Czech message, e.g. a full event', async () => {
    const { repository, service } = setup();
    repository.join.mockResolvedValue({ ok: false, refusal: 'EVENT_FULL' });

    const error = (await service
      .join('e1', 'u9', null, now)
      .catch((e: unknown) => e)) as ConflictException;

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toEqual({
      code: 'EVENT_FULL',
      message: 'Akce je plná.',
    });
  });

  it('a members-only event of a group the user is not in is 403, and nothing is joined', async () => {
    const { repository, service } = setup(
      aDetail({ visibility: 'members', group: { id: 'g1', name: 'Skupina' } }),
    );

    await expect(service.join('e1', 'u9', null, now)).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.join).not.toHaveBeenCalled();
  });

  it('leaving when not in is 409 NOT_JOINED', async () => {
    const { repository, service } = setup();
    repository.leave.mockResolvedValue({ ok: false, refusal: 'NOT_JOINED' });

    await expect(service.leave('e1', 'u9', now)).rejects.toThrow(
      ConflictException,
    );
  });

  it('leaving frees the place: the detail comes back without the participation', async () => {
    const { repository, service } = setup();
    repository.leave.mockResolvedValue({ ok: true });
    repository.findParticipationStatus.mockResolvedValue('withdrawn');

    await expect(service.leave('e1', 'u9', now)).resolves.toMatchObject({
      myParticipation: null,
    });
  });
});

describe('EventsService.updateEvent', () => {
  const setup = (
    detail: EventDetail = aDetail(),
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    repository.findEventDetail.mockResolvedValue(detail);
    repository.findApprovedParticipants.mockResolvedValue(participants);
    repository.findParticipationStatus.mockResolvedValue(null);
    repository.catalogRefsExist.mockResolvedValue({
      activity: true,
      locality: true,
    });
    // what the lock reads: by default the same event as the pre-read
    repository.updateEvent.mockImplementation(async (_id, decide) =>
      decide({
        status: detail.status,
        startsAt: detail.startsAt,
        endsAt: detail.endsAt,
        approvedCount: 2,
        minParticipants: 3,
        maxParticipants: 6,
      }),
    );
    return { repository, service: new EventsService(repository) };
  };

  it('the organizer changes the event and gets the updated detail', async () => {
    const { repository, service } = setup();
    const changes = { title: 'Deskovky ve středu', maxParticipants: 8 };

    await service.updateEvent('e1', 'u1', changes, now);

    expect(repository.updateEvent).toHaveBeenCalledWith(
      'e1',
      expect.any(Function),
    );
    const decide = repository.updateEvent.mock.calls[0]![1];
    expect(
      decide({
        status: 'published',
        startsAt: aDetail().startsAt,
        endsAt: null,
        approvedCount: 2,
        minParticipants: 3,
        maxParticipants: 6,
      }),
    ).toEqual({ ok: true, data: changes });
  });

  it("any admin of the event's group changes it, not a regular member (B-055)", async () => {
    const admin = setup(groupEventDetail());
    admin.repository.findActiveGroupRole.mockResolvedValue('admin');
    await admin.service.updateEvent('e1', 'u9', { title: 'Nově' }, now);
    expect(admin.repository.updateEvent).toHaveBeenCalled();

    const member = setup(groupEventDetail());
    member.repository.findActiveGroupRole.mockResolvedValue('member');
    await expect(
      member.service.updateEvent('e1', 'u9', { title: 'Nově' }, now),
    ).rejects.toThrow(ForbiddenException);
    expect(member.repository.updateEvent).not.toHaveBeenCalled();
  });

  it('an edit that waited for the lock behind a cancel is 409, not written', async () => {
    const { repository, service } = setup();
    // the pre-read still saw it published; the cancel won the lock
    repository.updateEvent.mockImplementation(async (_id, decide) =>
      decide({
        status: 'cancelled',
        startsAt: aDetail().startsAt,
        endsAt: null,
        approvedCount: 2,
        minParticipants: 3,
        maxParticipants: 6,
      }),
    );

    await expect(
      service.updateEvent('e1', 'u1', { title: 'Pozdě' }, now),
    ).rejects.toThrow(ConflictException);
  });

  it('anyone else gets 403 and nothing changes (B-028)', async () => {
    const { repository, service } = setup();

    await expect(
      service.updateEvent('e1', 'u9', { title: 'Cizí' }, now),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.updateEvent).not.toHaveBeenCalled();
  });

  it('a started event is 400 (B-028)', async () => {
    const { repository, service } = setup(aDetail({ startsAt: now }));

    await expect(
      service.updateEvent('e1', 'u1', { title: 'Pozdě' }, now),
    ).rejects.toThrow(BadRequestException);
    expect(repository.updateEvent).not.toHaveBeenCalled();
  });

  it('the maximum below the approved participants is 400 with the count (B-028)', async () => {
    const { service } = setup();

    const error = (await service
      .updateEvent('e1', 'u1', { maxParticipants: 1, minParticipants: 1 }, now)
      .catch((e: unknown) => e)) as BadRequestException;

    expect(error).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify(error.getResponse())).toContain(
      'Maximum nejde snížit pod počet přihlášených (2).',
    );
  });

  it('a cancelled event is 409', async () => {
    const { service } = setup(aDetail({ status: 'cancelled' }));

    await expect(
      service.updateEvent('e1', 'u1', { title: 'x' }, now),
    ).rejects.toThrow(ConflictException);
  });

  it('a new start in the past, or an unknown locality, is 400', async () => {
    const past = setup();
    await expect(
      past.service.updateEvent('e1', 'u1', { startsAt: now }, now),
    ).rejects.toThrow(BadRequestException);

    const unknown = setup();
    unknown.repository.catalogRefsExist.mockResolvedValue({
      activity: true,
      locality: false,
    });
    await expect(
      unknown.service.updateEvent('e1', 'u1', { localityId: 'l-x' }, now),
    ).rejects.toThrow(BadRequestException);
    expect(unknown.repository.updateEvent).not.toHaveBeenCalled();
  });
});

const requests = [
  {
    id: 'u5',
    name: 'Jakub',
    requestedAt: new Date('2026-10-22T10:00:00.000Z'),
    message: 'Hraju rád, přijdu včas.',
  },
];

describe('EventsService.getParticipants', () => {
  const setup = (
    detail: EventDetail = aDetail(),
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    repository.findEventDetail.mockResolvedValue(detail);
    repository.findApprovedParticipants.mockResolvedValue(participants);
    repository.findParticipationStatus.mockResolvedValue(null);
    repository.findPendingRequests.mockResolvedValue(requests);
    return { repository, service: new EventsService(repository) };
  };

  it('the organizer gets the approved participants and the waiting requests', async () => {
    const { service } = setup();

    await expect(service.getParticipants('e1', 'u1', now)).resolves.toEqual({
      participants,
      requests,
    });
  });

  it("any admin of the event's group gets them too, a regular member 403 (B-055)", async () => {
    const admin = setup(groupEventDetail());
    admin.repository.findActiveGroupRole.mockResolvedValue('admin');
    await expect(
      admin.service.getParticipants('e1', 'u9', now),
    ).resolves.toEqual({ participants, requests });

    const member = setup(groupEventDetail());
    member.repository.findActiveGroupRole.mockResolvedValue('member');
    await expect(
      member.service.getParticipants('e1', 'u9', now),
    ).rejects.toThrow(ForbiddenException);
    expect(member.repository.findPendingRequests).not.toHaveBeenCalled();
  });

  it('a cancelled event still shows who was coming', async () => {
    const { service } = setup(aDetail({ status: 'cancelled' }));

    await expect(service.getParticipants('e1', 'u1', now)).resolves.toEqual({
      participants,
      requests,
    });
  });

  it('anyone else gets 403, a participant too (#43)', async () => {
    const { repository, service } = setup();

    const error = (await service
      .getParticipants('e1', 'u2', now)
      .catch((e: unknown) => e)) as ForbiddenException;

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ code: 'NOT_ORGANIZER' });
    // the requests (names of people asking, their messages) never leave for
    // someone else (#175)
    expect(repository.findPendingRequests).not.toHaveBeenCalled();
  });

  it('an event the user may not see is 404', async () => {
    const { service } = setup(aDetail({ status: 'hidden' }));

    await expect(service.getParticipants('e1', 'u1', now)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('EventsService.getGroupEvents (B-055)', () => {
  const setup = (): {
    repository: MockProxy<EventRepository>;
    service: EventsService;
  } => {
    const repository = mock<EventRepository>();
    repository.findGroupEvents.mockImplementation(async ({ when }) => [
      { ...anEvent(when, 2), visibility: 'public' },
    ]);
    return { repository, service: new EventsService(repository) };
  };

  it('loads the upcoming and the past section, with the limit', async () => {
    const { repository, service } = setup();
    repository.findActiveGroupRole.mockResolvedValue(null);

    const result = await service.getGroupEvents('g1', 'u9', now);

    expect(result.upcoming.map((event) => event.id)).toEqual(['upcoming']);
    expect(result.past.map((event) => event.id)).toEqual(['past']);
    for (const when of ['upcoming', 'past']) {
      expect(repository.findGroupEvents).toHaveBeenCalledWith({
        groupId: 'g1',
        when,
        includeMembersOnly: false,
        now,
        limit: GROUP_EVENTS_LIMIT,
      });
    }
  });

  it.each(['member', 'admin'] as const)(
    'an active %s gets the members-only events too',
    async (role) => {
      const { repository, service } = setup();
      repository.findActiveGroupRole.mockResolvedValue(role);

      await service.getGroupEvents('g1', 'u9', now);

      expect(repository.findActiveGroupRole).toHaveBeenCalledWith('g1', 'u9');
      expect(repository.findGroupEvents).toHaveBeenCalledWith(
        expect.objectContaining({ includeMembersOnly: true }),
      );
    },
  );

  it('a visitor does not, and no membership is looked up', async () => {
    const { repository, service } = setup();

    await service.getGroupEvents('g1', null, now);

    expect(repository.findActiveGroupRole).not.toHaveBeenCalled();
    expect(repository.findGroupEvents).toHaveBeenCalledWith(
      expect.objectContaining({ includeMembersOnly: false }),
    );
  });
});

describe('EventsService.getMyEvents', () => {
  it('asks the repository for the tab of the signed-in user, with the limit', async () => {
    const repository = mock<EventRepository>();
    const events = [
      {
        ...anEvent('e1', 2),
        status: 'published' as const,
        myParticipation: 'pending' as const,
        pendingRequests: null,
      },
    ];
    repository.findMyEvents.mockResolvedValue(events);

    await expect(
      new EventsService(repository).getMyEvents('u1', 'attending', now),
    ).resolves.toEqual(events);
    expect(repository.findMyEvents).toHaveBeenCalledWith({
      tab: 'attending',
      userId: 'u1',
      now,
      limit: MY_EVENTS_LIMIT,
    });
  });
});

describe('EventsService.decideRequests (#53)', () => {
  const setup = (
    detail: EventDetail = aDetail({ approvalMode: 'approval' }),
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    repository.findEventDetail.mockResolvedValue(detail);
    repository.findApprovedParticipants.mockResolvedValue(participants);
    repository.findParticipationStatus.mockResolvedValue(null);
    repository.findPendingRequests.mockResolvedValue([]);
    // what the lock reads: 2 approved of 6, the decided users waiting
    repository.decideRequests.mockImplementation(
      async (_id, userIds, _outcome, decide) =>
        decide({
          eventStatus: 'published',
          startsAt: detail.startsAt,
          maxParticipants: 6,
          approvedCount: 2,
          requestStatuses: userIds.map(() => 'pending'),
        }),
    );
    return { repository, service: new EventsService(repository) };
  };

  it('the organizer approves a request and gets the lists as they are now', async () => {
    const { repository, service } = setup();

    await expect(
      service.decideRequests('e1', 'u1', ['u5'], 'approve', now),
    ).resolves.toEqual({ participants, requests: [] });
    expect(repository.decideRequests).toHaveBeenCalledWith(
      'e1',
      ['u5'],
      'approved',
      expect.any(Function),
      now,
    );
  });

  it('rejecting writes „rejected“; a repeated id counts once', async () => {
    const { repository, service } = setup();

    await service.decideRequests('e1', 'u1', ['u5', 'u5'], 'reject', now);

    expect(repository.decideRequests).toHaveBeenCalledWith(
      'e1',
      ['u5'],
      'rejected',
      expect.any(Function),
      now,
    );
  });

  it('anyone else gets 403 and nothing is decided', async () => {
    const { repository, service } = setup();

    await expect(
      service.decideRequests('e1', 'u5', ['u5'], 'approve', now),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.decideRequests).not.toHaveBeenCalled();
  });

  it('approving past the free places is 409 EVENT_FULL with a Czech message', async () => {
    const { repository, service } = setup();
    repository.decideRequests.mockImplementation(
      async (_id, userIds, _outcome, decide) =>
        decide({
          eventStatus: 'published',
          startsAt: aDetail().startsAt,
          maxParticipants: 6,
          approvedCount: 6,
          requestStatuses: userIds.map(() => 'pending'),
        }),
    );

    const error = (await service
      .decideRequests('e1', 'u1', ['u5'], 'approve', now)
      .catch((e: unknown) => e)) as ConflictException;

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toEqual({
      code: 'EVENT_FULL',
      message: 'Akce je plná.',
    });
  });

  it('a request withdrawn meanwhile is 409 NOT_PENDING', async () => {
    const { repository, service } = setup();
    repository.decideRequests.mockImplementation(
      async (_id, _userIds, _outcome, decide) =>
        decide({
          eventStatus: 'published',
          startsAt: aDetail().startsAt,
          maxParticipants: 6,
          approvedCount: 2,
          requestStatuses: ['withdrawn'],
        }),
    );

    const error = (await service
      .decideRequests('e1', 'u1', ['u5'], 'approve', now)
      .catch((e: unknown) => e)) as ConflictException;

    expect(error.getResponse()).toMatchObject({ code: 'NOT_PENDING' });
  });

  it('an event the user may not see is 404', async () => {
    const { repository, service } = setup(aDetail({ status: 'hidden' }));

    await expect(
      service.decideRequests('e1', 'u1', ['u5'], 'approve', now),
    ).rejects.toThrow(NotFoundException);
    expect(repository.decideRequests).not.toHaveBeenCalled();
  });

  it('an event gone before the lock is 404 in Czech, like the detail', async () => {
    const { repository, service } = setup();
    repository.decideRequests.mockResolvedValue(null);

    const error = (await service
      .decideRequests('e1', 'u1', ['u5'], 'approve', now)
      .catch((e: unknown) => e)) as NotFoundException;

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.message).toBe('Akce neexistuje.');
  });
});
