import {
  OrganizerRatingRow,
  organizerRatingSummary,
  participantRatingSummary,
  summarizeStars,
  summarizeTotals,
} from './rating-summary';

const deletedAt = new Date('2026-10-30T10:00:00.000Z');

describe('summarizeStars', () => {
  it('without ratings the average is null, not 0', () => {
    expect(summarizeStars([])).toEqual({ average: null, count: 0 });
  });

  it('one rating is its own average', () => {
    expect(summarizeStars([4])).toEqual({ average: 4, count: 1 });
  });

  it('rounds to one decimal', () => {
    expect(summarizeStars([4, 4, 5])).toEqual({ average: 4.3, count: 3 });
    expect(summarizeStars([5, 5, 4])).toEqual({ average: 4.7, count: 3 });
    expect(summarizeStars([1, 2])).toEqual({ average: 1.5, count: 2 });
  });

  it('rounds a half up', () => {
    // 17 / 4 = 4.25
    expect(summarizeStars([4, 4, 4, 5])).toEqual({ average: 4.3, count: 4 });
  });
});

describe('summarizeTotals (#178)', () => {
  it('rounds an aggregate like summarizeStars, and no ratings stay null', () => {
    expect(summarizeTotals(17, 4)).toEqual(summarizeStars([4, 4, 4, 5]));
    expect(summarizeTotals(0, 0)).toEqual({ average: null, count: 0 });
  });
});

const asOrganizer = (
  organizerStars: number,
  overrides: Partial<OrganizerRatingRow> = {},
): OrganizerRatingRow => ({
  organizerStars,
  deletedAt: null,
  event: { groupId: null },
  ...overrides,
});

describe('organizerRatingSummary (B-060)', () => {
  it('averages organizerStars', () => {
    expect(
      organizerRatingSummary([asOrganizer(5), asOrganizer(4), asOrganizer(4)]),
    ).toEqual({ average: 4.3, count: 3 });
  });

  it('without ratings: null and 0', () => {
    expect(organizerRatingSummary([])).toEqual({ average: null, count: 0 });
  });

  it('ignores ratings a superadmin deleted (B-063), also in the count', () => {
    expect(
      organizerRatingSummary([asOrganizer(5), asOrganizer(1, { deletedAt })]),
    ).toEqual({ average: 5, count: 1 });
  });

  it('only deleted ratings: as if there were none', () => {
    expect(organizerRatingSummary([asOrganizer(2, { deletedAt })])).toEqual({
      average: null,
      count: 0,
    });
  });

  it('events of a group count towards the group, not the person', () => {
    expect(
      organizerRatingSummary([
        asOrganizer(5),
        asOrganizer(1, { event: { groupId: 'g-florbal' } }),
      ]),
    ).toEqual({ average: 5, count: 1 });
    expect(
      organizerRatingSummary([
        asOrganizer(3, { event: { groupId: 'g-florbal' } }),
      ]),
    ).toEqual({ average: null, count: 0 });
  });
});

describe('participantRatingSummary (#180)', () => {
  it('averages the stars organizers gave', () => {
    expect(
      participantRatingSummary([
        { stars: 5, deletedAt: null },
        { stars: 3, deletedAt: null },
      ]),
    ).toEqual({ average: 4, count: 2 });
  });

  it('without ratings: null and 0', () => {
    expect(participantRatingSummary([])).toEqual({ average: null, count: 0 });
  });

  it('ignores ratings a superadmin deleted (B-063), also in the count', () => {
    expect(
      participantRatingSummary([
        { stars: 4, deletedAt: null },
        { stars: 1, deletedAt },
      ]),
    ).toEqual({ average: 4, count: 1 });
  });
});
