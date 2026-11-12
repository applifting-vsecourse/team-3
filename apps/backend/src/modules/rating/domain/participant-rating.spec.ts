import {
  decideParticipantRating,
  eventNotRatable,
  hasEventEnded,
  ParticipantRatingState,
} from './participant-rating';

const now = new Date('2026-11-01T12:00:00.000Z');
const yesterday = new Date('2026-10-31T17:00:00.000Z');
const tomorrow = new Date('2026-11-02T17:00:00.000Z');

describe('hasEventEnded', () => {
  it('with an end: once the end has passed', () => {
    expect(hasEventEnded({ startsAt: yesterday, endsAt: now }, now)).toBe(true);
    // started but still going on
    expect(hasEventEnded({ startsAt: yesterday, endsAt: tomorrow }, now)).toBe(
      false,
    );
  });

  it('without an end: once the start has passed', () => {
    expect(hasEventEnded({ startsAt: yesterday, endsAt: null }, now)).toBe(
      true,
    );
    expect(hasEventEnded({ startsAt: now, endsAt: null }, now)).toBe(true);
    expect(hasEventEnded({ startsAt: tomorrow, endsAt: null }, now)).toBe(
      false,
    );
  });
});

const state = (
  overrides: Partial<ParticipantRatingState> = {},
): ParticipantRatingState => ({
  eventStatus: 'published',
  startsAt: yesterday,
  endsAt: null,
  organizerUserId: 'u-petra',
  raterId: 'u-petra',
  participantId: 'u-jakub',
  participationStatus: 'approved',
  ratingDeleted: false,
  ...overrides,
});

describe('decideParticipantRating (#180)', () => {
  it('the organizer rates an approved participant of an event that took place', () => {
    expect(decideParticipantRating(state(), now)).toEqual({ ok: true });
  });

  it('only once the event is over', () => {
    expect(decideParticipantRating(state({ startsAt: tomorrow }), now)).toEqual(
      { ok: false, refusal: 'EVENT_NOT_ENDED' },
    );
    expect(decideParticipantRating(state({ endsAt: tomorrow }), now)).toEqual({
      ok: false,
      refusal: 'EVENT_NOT_ENDED',
    });
  });

  it('within 14 days of the end: day 14 passes, later is RATING_WINDOW_CLOSED (#66)', () => {
    const fourteenDaysAgo = new Date('2026-10-18T12:00:00.000Z');
    expect(
      decideParticipantRating(state({ startsAt: fourteenDaysAgo }), now),
    ).toEqual({ ok: true });
    expect(
      decideParticipantRating(
        state({ startsAt: new Date(fourteenDaysAgo.getTime() - 1) }),
        now,
      ),
    ).toEqual({ ok: false, refusal: 'RATING_WINDOW_CLOSED' });
  });

  it('not for a cancelled event, nor one a superadmin hid or deleted', () => {
    for (const eventStatus of ['cancelled', 'hidden', 'deleted'] as const) {
      expect(decideParticipantRating(state({ eventStatus }), now)).toEqual({
        ok: false,
        refusal: 'EVENT_NOT_PUBLISHED',
      });
    }
  });

  it('only the organizer of the event rates', () => {
    expect(decideParticipantRating(state({ raterId: 'u-tomas' }), now)).toEqual(
      { ok: false, refusal: 'NOT_ORGANIZER' },
    );
  });

  it('NOT_ORGANIZER comes first: before the window and the state of the event (#313)', () => {
    for (const overrides of [
      { startsAt: new Date('2026-10-01T12:00:00.000Z') },
      { startsAt: tomorrow },
      { eventStatus: 'cancelled' as const },
    ]) {
      expect(
        decideParticipantRating(
          state({ raterId: 'u-tomas', ...overrides }),
          now,
        ),
      ).toEqual({ ok: false, refusal: 'NOT_ORGANIZER' });
    }
  });

  it('the organizer, joined to their own event (Q12), does not rate themselves', () => {
    expect(
      decideParticipantRating(state({ participantId: 'u-petra' }), now),
    ).toEqual({ ok: false, refusal: 'SELF_RATING' });
  });

  it('a rating a superadmin deleted is not given again (#66)', () => {
    expect(
      decideParticipantRating(state({ ratingDeleted: true }), now),
    ).toEqual({ ok: false, refusal: 'RATING_DELETED' });
  });

  it('only someone who was approved', () => {
    for (const participationStatus of [
      null,
      'pending',
      'rejected',
      'withdrawn',
      'removed',
    ] as const) {
      expect(
        decideParticipantRating(state({ participationStatus }), now),
      ).toEqual({ ok: false, refusal: 'NOT_APPROVED' });
    }
  });
});

describe('eventNotRatable (#66)', () => {
  const event = {
    eventStatus: 'published' as const,
    startsAt: yesterday,
    endsAt: null,
  };

  it('null for an event that took place within 14 days', () => {
    expect(eventNotRatable(event, now)).toBeNull();
  });

  it('says why not: cancelled or hidden, not over yet, after 14 days', () => {
    expect(eventNotRatable({ ...event, eventStatus: 'cancelled' }, now)).toBe(
      'EVENT_NOT_PUBLISHED',
    );
    expect(eventNotRatable({ ...event, startsAt: tomorrow }, now)).toBe(
      'EVENT_NOT_ENDED',
    );
    expect(
      eventNotRatable(
        { ...event, startsAt: new Date('2026-10-01T12:00:00.000Z') },
        now,
      ),
    ).toBe('RATING_WINDOW_CLOSED');
  });
});
