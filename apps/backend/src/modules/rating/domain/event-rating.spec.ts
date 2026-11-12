import { decideEventRating, EventRatingState } from './event-rating';

const now = new Date('2026-11-01T12:00:00.000Z');
const yesterday = new Date('2026-10-31T17:00:00.000Z');
const tomorrow = new Date('2026-11-02T17:00:00.000Z');

const state = (
  overrides: Partial<EventRatingState> = {},
): EventRatingState => ({
  eventStatus: 'published',
  startsAt: yesterday,
  endsAt: null,
  organizerUserId: 'u-petra',
  raterId: 'u-jakub',
  participationStatus: 'approved',
  ratingDeleted: false,
  ...overrides,
});

describe('decideEventRating (#66)', () => {
  it('an approved participant rates an event that took place', () => {
    expect(decideEventRating(state(), now)).toEqual({ ok: true });
  });

  it('the organizer does not rate their own event, even joined to it (Q12)', () => {
    expect(decideEventRating(state({ raterId: 'u-petra' }), now)).toEqual({
      ok: false,
      refusal: 'OWN_EVENT',
    });
  });

  it('only someone who was approved', () => {
    for (const participationStatus of [
      null,
      'pending',
      'rejected',
      'withdrawn',
      'removed',
    ] as const) {
      expect(decideEventRating(state({ participationStatus }), now)).toEqual({
        ok: false,
        refusal: 'NOT_PARTICIPANT',
      });
    }
  });

  it('who may rate comes first: a stranger learns nothing about the event', () => {
    expect(
      decideEventRating(
        state({ participationStatus: null, startsAt: tomorrow }),
        now,
      ),
    ).toEqual({ ok: false, refusal: 'NOT_PARTICIPANT' });
  });

  it('not for a cancelled event, nor one a superadmin hid or deleted', () => {
    for (const eventStatus of ['cancelled', 'hidden', 'deleted'] as const) {
      expect(decideEventRating(state({ eventStatus }), now)).toEqual({
        ok: false,
        refusal: 'EVENT_NOT_PUBLISHED',
      });
    }
  });

  it('only once the event is over', () => {
    expect(decideEventRating(state({ startsAt: tomorrow }), now)).toEqual({
      ok: false,
      refusal: 'EVENT_NOT_ENDED',
    });
    expect(decideEventRating(state({ endsAt: tomorrow }), now)).toEqual({
      ok: false,
      refusal: 'EVENT_NOT_ENDED',
    });
  });

  it('within 14 days of the end: day 14 passes, later is RATING_WINDOW_CLOSED', () => {
    const fourteenDaysAgo = new Date('2026-10-18T12:00:00.000Z');
    expect(
      decideEventRating(state({ startsAt: fourteenDaysAgo }), now),
    ).toEqual({ ok: true });
    expect(
      decideEventRating(
        state({ startsAt: new Date(fourteenDaysAgo.getTime() - 1) }),
        now,
      ),
    ).toEqual({ ok: false, refusal: 'RATING_WINDOW_CLOSED' });
  });

  it('a rating a superadmin deleted is not given again', () => {
    expect(decideEventRating(state({ ratingDeleted: true }), now)).toEqual({
      ok: false,
      refusal: 'RATING_DELETED',
    });
  });
});
