import type { ProfileOverview } from '@/modules/profile/domain/profile';
import { ProfileOverviewResponseDto } from './profile.response.dto';

describe('ProfileOverviewResponseDto (#178)', () => {
  it('flattens each event the way GET /api/events sends it', () => {
    const event = {
      id: 'e1',
      title: 'Deskovky',
      summary: null,
      startsAt: new Date('2026-11-10T16:00:00.000Z'),
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
      capacity: {
        approvedCount: 2,
        missingToMin: 1,
        freeSpots: 4,
        isFull: false,
      },
      isPromoted: false,
      distanceKm: null,
      status: 'published' as const,
      localityName: 'Praha 8',
      participation: 'approved' as const,
    };
    const summary = { average: null, count: 0 };
    const overview: ProfileOverview = {
      organizing: [],
      organizingTotal: 0,
      upcoming: [event],
      upcomingTotal: 1,
      past: [],
      pastTotal: 0,
      participantRatings: [],
      organizerRatings: [],
      participantSummary: summary,
      organizerSummary: summary,
    };
    const [dto] = ProfileOverviewResponseDto.fromDomain(overview).upcoming;
    expect(dto).toMatchObject({
      approvedCount: 2,
      missingToMin: 1,
      freeSpots: 4,
      isFull: false,
      localityName: 'Praha 8',
      participation: 'approved',
    });
    expect(dto).not.toHaveProperty('capacity');
  });
});
