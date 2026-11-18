import type { ProfileOverview } from '@/modules/profile/domain/profile';
import { ProfileOverviewResponseDto } from './profile.response.dto';

describe('ProfileOverviewResponseDto (#178, #367)', () => {
  it('sends the ratings and nothing else: my events are in Moje (#367)', () => {
    const summary = { average: 4.5, count: 2 };
    const rating = {
      id: 'r1',
      stars: 5,
      comment: null,
      createdAt: new Date('2026-11-10T16:00:00.000Z'),
      event: { id: 'e1', title: 'Deskovky' },
      author: { id: 'u-org', name: 'Petra' },
    };
    // an adapter that still hands over events must not leak them into the response
    const overview = {
      participantRatings: [rating],
      organizerRatings: [],
      participantSummary: summary,
      organizerSummary: summary,
      upcoming: [{ id: 'e2' }],
    } as ProfileOverview;
    expect(ProfileOverviewResponseDto.fromDomain(overview)).toEqual({
      participantRatings: [rating],
      organizerRatings: [],
      participantSummary: summary,
      organizerSummary: summary,
    });
  });
});
