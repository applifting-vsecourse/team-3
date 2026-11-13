import {
  canSeeReceivedRatings,
  ReceivedRating,
  toReceivedRatings,
} from './received-ratings';

const updatedAt = new Date('2026-11-01T08:00:00.000Z');
const rating = (
  eventStars: number,
  organizerStars: number,
): ReceivedRating => ({
  author: { id: `u-${eventStars}${organizerStars}`, name: 'Jakub' },
  eventStars,
  organizerStars,
  comment: null,
  updatedAt,
});

describe('received ratings (B-060, #66)', () => {
  it('both averages, rounded to one decimal, with their count', () => {
    expect(
      toReceivedRatings([rating(5, 4), rating(4, 4), rating(4, 5)]).summary,
    ).toEqual({
      event: { average: 4.3, count: 3 },
      organizer: { average: 4.3, count: 3 },
    });
  });

  it('without ratings: no average, not 0', () => {
    expect(toReceivedRatings([])).toEqual({
      summary: {
        event: { average: null, count: 0 },
        organizer: { average: null, count: 0 },
      },
      ratings: [],
    });
  });

  it('only who manages the event sees them', () => {
    expect(
      canSeeReceivedRatings({ isOrganizer: true, isGroupAdmin: false }),
    ).toBe(true);
    expect(
      canSeeReceivedRatings({ isOrganizer: false, isGroupAdmin: true }),
    ).toBe(true);
    expect(
      canSeeReceivedRatings({ isOrganizer: false, isGroupAdmin: false }),
    ).toBe(false);
  });
});
