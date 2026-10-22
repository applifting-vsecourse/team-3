import { computeCapacity } from '@/modules/event/domain/capacity';
import { PublicEvent } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { mock } from 'jest-mock-extended';
import {
  EventsService,
  MISSING_ONLY_SCAN_LIMIT,
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

  it('missingOnly keeps only events that miss people to reach the minimum', async () => {
    const repository = mock<EventRepository>();
    repository.findPublicEvents.mockResolvedValue([
      anEvent('missing-one', 2),
      anEvent('at-minimum', 3),
      anEvent('nobody-yet', 0),
      anEvent('full', 6),
    ]);

    const service = new EventsService(repository);
    const result = await service.getPublicEvents({ missingOnly: true }, now);

    expect(result.map((event) => event.id)).toEqual([
      'missing-one',
      'nobody-yet',
    ]);
  });

  it('missingOnly filters before the limit, so matches are not cut off', async () => {
    const repository = mock<EventRepository>();
    const complete = Array.from({ length: PUBLIC_EVENTS_LIMIT }, (_, i) =>
      anEvent(`complete-${i}`, 3),
    );
    const missing = Array.from({ length: PUBLIC_EVENTS_LIMIT + 5 }, (_, i) =>
      anEvent(`missing-${i}`, 1),
    );
    repository.findPublicEvents.mockResolvedValue([...complete, ...missing]);

    const service = new EventsService(repository);
    const result = await service.getPublicEvents({ missingOnly: true }, now);

    expect(repository.findPublicEvents).toHaveBeenCalledWith({
      filters: { missingOnly: true },
      now,
      limit: MISSING_ONLY_SCAN_LIMIT,
    });
    expect(result).toHaveLength(PUBLIC_EVENTS_LIMIT);
    expect(result.every((event) => event.id.startsWith('missing-'))).toBe(true);
  });
});
