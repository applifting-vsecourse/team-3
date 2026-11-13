import { computeCapacity } from '@/modules/event/domain/capacity';
import { PublicEvent } from '@/modules/event/domain/event';
import { nearestEvents } from './nearest-events';

// Police nad Metují, and events around it
const POLICE = { lat: 50.5369, lng: 16.2335 };

const at = (id: string, lat: number, lng: number): PublicEvent => ({
  id,
  title: id,
  summary: null,
  startsAt: new Date('2026-11-20T16:00:00.000Z'),
  endsAt: null,
  address: id,
  lat,
  lng,
  activity: {
    id: 'a',
    slug: 'a',
    name: 'A',
    keywords: [],
    category: { id: 'c', slug: 'c', name: 'C', icon: 'ball' },
  },
  locality: { id: 'l', slug: 'l', name: 'L' },
  organizer: { id: 'u', name: 'U' },
  group: null,
  minParticipants: 2,
  maxParticipants: 10,
  capacity: computeCapacity({ minParticipants: 2, maxParticipants: 10 }, 1),
  isPromoted: false,
  distanceKm: null,
});

describe('nearestEvents (#299)', () => {
  const praha = at('praha', 50.0755, 14.4378);
  const trutnov = at('trutnov', 50.561, 15.9127);
  const hradec = at('hradec', 50.2092, 15.8328);

  it('nearest first, each with its distance to one decimal', () => {
    const nearest = nearestEvents([praha, hradec, trutnov], POLICE);

    expect(nearest.map((event) => event.id)).toEqual([
      'trutnov',
      'hradec',
      'praha',
    ]);
    expect(nearest[0].distanceKm).toBe(22.8);
    for (const event of nearest) {
      expect(Number.isInteger((event.distanceKm ?? 0) * 10)).toBe(true);
    }
  });

  it('keeps the order of equally far events (soonest first in the input)', () => {
    const sooner = at('sooner', 50.561, 15.9127);
    const later = at('later', 50.561, 15.9127);
    expect(
      nearestEvents([sooner, later], POLICE).map((event) => event.id),
    ).toEqual(['sooner', 'later']);
  });

  it('cuts at the limit', () => {
    expect(nearestEvents([praha, hradec, trutnov], POLICE, 2)).toHaveLength(2);
  });
});
