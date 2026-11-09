import { computeCapacity } from '@/modules/event/domain/capacity';
import { PublicEvent } from '@/modules/event/domain/event';
import { keepPicked } from './picked-events';

const event = (
  id: string,
  activityId = 'a-volejbal',
  organizerId = 'u-org',
): PublicEvent => ({
  id,
  title: id,
  summary: null,
  distanceKm: null,
  startsAt: new Date('2026-11-05T16:00:00.000Z'),
  endsAt: null,
  address: 'Praha',
  lat: 50,
  lng: 14,
  activity: {
    id: activityId,
    slug: activityId,
    name: activityId,
    keywords: [],
    category: { id: 'c', slug: 'c', name: 'C', icon: 'ball' },
  },
  locality: { id: 'l', slug: 'l', name: 'L' },
  organizer: { id: organizerId, name: 'X' },
  group: null,
  minParticipants: 3,
  maxParticipants: 6,
  capacity: computeCapacity({ minParticipants: 3, maxParticipants: 6 }, 1),
  isPromoted: false,
});

const viewer = {
  id: 'u-me',
  interestActivityIds: ['a-volejbal'],
  joinedEventIds: ['j'],
};

describe('keepPicked', () => {
  const events = [
    event('v'),
    event('t', 'a-tenis'),
    event('j'),
    event('mine', 'a-volejbal', 'u-me'),
  ];

  it('keeps everything without a pick', () => {
    expect(keepPicked(events, {}, viewer, new Map())).toHaveLength(4);
  });

  it("interests: only the viewer's activities; everything without any or for a visitor", () => {
    expect(
      keepPicked(events, { interests: true }, viewer, new Map()).map(
        (e) => e.id,
      ),
    ).toEqual(['v', 'j', 'mine']);
    expect(
      keepPicked(
        events,
        { interests: true },
        { ...viewer, interestActivityIds: [] },
        new Map(),
      ),
    ).toHaveLength(4);
    expect(
      keepPicked(events, { interests: true }, null, new Map()),
    ).toHaveLength(4);
  });

  it('notJoined: no event joined or organized; a visitor keeps all', () => {
    expect(
      keepPicked(events, { notJoined: true }, viewer, new Map()).map(
        (e) => e.id,
      ),
    ).toEqual(['v', 't']);
    expect(
      keepPicked(events, { notJoined: true }, null, new Map()),
    ).toHaveLength(4);
  });

  it('wellRated: at least 4.5 from at least 3 ratings', () => {
    const ratings = new Map([['user:u-org', { average: 4.5, count: 3 }]]);
    expect(
      keepPicked(events, { wellRated: true }, null, ratings).map((e) => e.id),
    ).toEqual(['v', 't', 'j']);
  });
});
