import type { PublicEvent } from '@/modules/event/domain/event';
import { PublicEventResponseDto } from './public-event.response.dto';

const anEvent = (overrides: Partial<PublicEvent> = {}): PublicEvent => ({
  id: 'e1',
  title: 'Volejbal pro pokročilé',
  summary: null,
  startsAt: new Date('2026-12-02T17:00:00.000Z'),
  endsAt: null,
  address: 'Městská hala Vodova, Vodova 108, Brno',
  lat: 49.2185,
  lng: 16.592,
  activity: {
    id: 'a1',
    slug: 'volejbal',
    name: 'Volejbal',
    keywords: ['odbíjená'],
    category: { id: 'c1', slug: 'sport', name: 'Sport', icon: 'ball' },
  },
  locality: { id: 'l1', slug: 'brno', name: 'Brno' },
  organizer: { id: 'u-org', name: 'Petra' },
  group: null,
  minParticipants: 6,
  maxParticipants: 12,
  approvalMode: 'approval',
  capacity: { approvedCount: 5, missingToMin: 1, freeSpots: 7, isFull: false },
  isPromoted: false,
  imageKey: null,
  distanceKm: null,
  ...overrides,
});

describe('PublicEventResponseDto', () => {
  // QA-06: the landing page asks for a request instead of promising the event takes place
  it('sends how joining works, so a list card can tell a request from a sign-up', () => {
    expect(PublicEventResponseDto.fromDomain(anEvent())).toMatchObject({
      approvalMode: 'approval',
      missingToMin: 1,
    });
    expect(
      PublicEventResponseDto.fromDomain(anEvent({ approvalMode: 'open' }))
        .approvalMode,
    ).toBe('open');
  });

  it('keeps the search keywords out of the API', () => {
    expect(
      PublicEventResponseDto.fromDomain(anEvent()).activity,
    ).not.toHaveProperty('keywords');
  });
});
