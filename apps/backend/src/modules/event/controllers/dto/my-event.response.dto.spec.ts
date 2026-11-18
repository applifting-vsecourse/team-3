import type { MyEvent } from '@/modules/event/domain/event';
import { MyEventResponseDto } from './my-event.response.dto';

const anEvent = (overrides: Partial<MyEvent> = {}): MyEvent => ({
  id: 'e1',
  title: 'Deskovky',
  summary: null,
  startsAt: new Date('2026-10-24T16:00:00.000Z'),
  endsAt: null,
  address: 'Herna Karlín, Křižíkova 52, Praha 8',
  lat: 50.09,
  lng: 14.45,
  activity: {
    id: 'a1',
    slug: 'deskove-hry',
    name: 'Deskové hry',
    keywords: [],
    category: { id: 'c1', slug: 'hry', name: 'Hry', icon: 'dice' },
  },
  locality: { id: 'l1', slug: 'praha-8', name: 'Praha 8' },
  organizer: { id: 'u-org', name: 'Petra' },
  group: null,
  minParticipants: 3,
  maxParticipants: 6,
  capacity: { approvedCount: 5, missingToMin: 0, freeSpots: 1, isFull: false },
  isPromoted: false,
  distanceKm: null,
  status: 'published',
  myParticipation: 'approved',
  pendingRequests: null,
  myEventStars: null,
  myRatingDeleted: false,
  ...overrides,
});

describe('MyEventResponseDto (B-035, #367)', () => {
  it('sends the stars I gave, for „tvoje ★ N“ in Proběhlé', () => {
    expect(
      MyEventResponseDto.fromDomain(anEvent({ myEventStars: 4 })),
    ).toMatchObject({ myEventStars: 4, myParticipation: 'approved' });
  });

  it('says when moderation deleted my rating: no stars, no „Ohodnotit“', () => {
    expect(
      MyEventResponseDto.fromDomain(anEvent({ myRatingDeleted: true })),
    ).toMatchObject({ myEventStars: null, myRatingDeleted: true });
  });

  it('null while I have not rated it: the card offers „Ohodnotit“', () => {
    expect(MyEventResponseDto.fromDomain(anEvent()).myEventStars).toBeNull();
  });
});
