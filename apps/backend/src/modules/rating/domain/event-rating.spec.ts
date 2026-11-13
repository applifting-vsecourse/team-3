import {
  decideEventRating,
  EVENT_RATING_FORBIDDEN,
  EVENT_RATING_REFUSALS,
  EVENT_RATING_SHOWN_REFUSALS,
  EventRatingState,
} from './event-rating';

const now = new Date('2026-11-01T12:00:00.000Z');
const yesterday = new Date('2026-10-31T17:00:00.000Z');
const tomorrow = new Date('2026-11-02T17:00:00.000Z');

const state = (
  overrides: Partial<EventRatingState> = {},
): EventRatingState => ({
  eventStatus: 'published',
  startsAt: yesterday,
  endsAt: null,
  minParticipants: 4,
  approvedCount: 5,
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

  it('within 14 Prague calendar days of the end: day 14 passes, the day before it is RATING_WINDOW_CLOSED', () => {
    // now is Sun 1. 11.: the window is open for an event that ended on Sun 18. 10. or later –
    // from Prague midnight, which is 22:00 UTC the day before (summer time), to the last moment
    const startOfDay14 = new Date('2026-10-17T22:00:00.000Z');
    expect(decideEventRating(state({ startsAt: startOfDay14 }), now)).toEqual({
      ok: true,
    });
    expect(
      decideEventRating(
        state({ startsAt: new Date(startOfDay14.getTime() - 1) }),
        now,
      ),
    ).toEqual({ ok: false, refusal: 'RATING_WINDOW_CLOSED' });
  });

  it('an admin of the group who went rates the event of a group they did not create (#313)', () => {
    // the organizer is who created the event, as for rating the participants (PR 2)
    expect(
      decideEventRating(
        state({ organizerUserId: 'u-petra', raterId: 'u-tomas' }),
        now,
      ),
    ).toEqual({ ok: true });
  });

  it('a rating a superadmin deleted stays RATING_DELETED after the window too (#313)', () => {
    expect(
      decideEventRating(
        state({
          ratingDeleted: true,
          startsAt: new Date('2026-10-01T12:00:00.000Z'),
        }),
        now,
      ),
    ).toEqual({ ok: false, refusal: 'RATING_DELETED' });
  });

  it('an event below its minimum did not take place: EVENT_NOT_HELD (#314)', () => {
    expect(decideEventRating(state({ approvedCount: 3 }), now)).toEqual({
      ok: false,
      refusal: 'EVENT_NOT_HELD',
    });
  });

  it('a rating a superadmin deleted is not given again', () => {
    expect(decideEventRating(state({ ratingDeleted: true }), now)).toEqual({
      ok: false,
      refusal: 'RATING_DELETED',
    });
  });
});

describe('event rating refusals (#313)', () => {
  it('the page shows every refusal the service does not answer with 403', () => {
    expect([...EVENT_RATING_SHOWN_REFUSALS].sort()).toEqual(
      EVENT_RATING_REFUSALS.filter(
        (refusal) => !EVENT_RATING_FORBIDDEN.includes(refusal),
      ).sort(),
    );
    expect(EVENT_RATING_SHOWN_REFUSALS).not.toContain('OWN_EVENT');
    expect(EVENT_RATING_SHOWN_REFUSALS).not.toContain('NOT_PARTICIPANT');
    expect(EVENT_RATING_SHOWN_REFUSALS).toContain('RATING_DELETED');
  });
});
