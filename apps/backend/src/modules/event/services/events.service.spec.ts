import { computeCapacity } from '@/modules/event/domain/capacity';
import { EventDetail, PublicEvent } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import {
  CAPACITY_SCAN_LIMIT,
  EventsService,
  PUBLIC_EVENTS_LIMIT,
} from './events.service';

const now = new Date('2026-10-23T08:00:00.000Z');

const anEvent = (id: string, approvedCount: number): PublicEvent => ({
  id,
  title: `Akce ${id}`,
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

    await expect(service.getPublicEvents(filters, now)).resolves.toEqual(
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
    const result = await service.getPublicEvents({ capacity: 'missing' }, now);

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
    const result = await service.getPublicEvents({ capacity: 'free' }, now);

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
    const result = await service.getPublicEvents({ capacity: 'missing' }, now);

    expect(repository.findPublicEvents).toHaveBeenCalledWith({
      filters: { capacity: 'missing' },
      now,
      limit: CAPACITY_SCAN_LIMIT,
    });
    expect(result).toHaveLength(PUBLIC_EVENTS_LIMIT);
    expect(result.every((event) => event.id.startsWith('missing-'))).toBe(true);
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
    repository.isActiveGroupMember.mockResolvedValue(false);
    return { repository, service: new EventsService(repository) };
  };

  it('a visitor gets the count, not the names', async () => {
    const { repository, service } = setup(aDetail());

    const result = await service.getEventDetail('e1', null, now);

    expect(result.capacity.approvedCount).toBe(2);
    expect(result.participants).toBeNull();
    expect(repository.findApprovedParticipants).not.toHaveBeenCalled();
    expect(repository.findEventDetail).toHaveBeenCalledWith('e1', now);
  });

  it('a signed-in user also gets the names of approved participants', async () => {
    const { repository, service } = setup(aDetail());

    const result = await service.getEventDetail('e1', 'u9', now);

    expect(result.participants).toEqual(participants);
    expect(repository.findApprovedParticipants).toHaveBeenCalledWith('e1');
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

    it('is 404 for a visitor', async () => {
      const { repository, service } = setup(membersOnly());

      await expect(service.getEventDetail('e1', null, now)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.isActiveGroupMember).not.toHaveBeenCalled();
    });

    it('is 404 for a signed-in user outside the group', async () => {
      const { repository, service } = setup(membersOnly());

      await expect(service.getEventDetail('e1', 'u9', now)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.isActiveGroupMember).toHaveBeenCalledWith('g1', 'u9');
    });

    it('is shown to an active member of the group, with the names', async () => {
      const { repository, service } = setup(membersOnly());
      repository.isActiveGroupMember.mockResolvedValue(true);

      const result = await service.getEventDetail('e1', 'u9', now);

      expect(result.id).toBe('e1');
      expect(result.participants).toEqual(participants);
    });

    it('is shown to its organizer', async () => {
      const { repository, service } = setup(membersOnly());

      await expect(
        service.getEventDetail('e1', 'u1', now),
      ).resolves.toMatchObject({ id: 'e1' });
      expect(repository.isActiveGroupMember).not.toHaveBeenCalled();
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

describe('EventsService.cancelEvent', () => {
  const setup = (
    detail: EventDetail = aDetail(),
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    repository.findEventDetail.mockResolvedValue(detail);
    repository.findApprovedParticipants.mockResolvedValue(participants);
    return { repository, service: new EventsService(repository) };
  };

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
