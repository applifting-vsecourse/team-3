import { decideEventRating } from './event-rating';
import {
  decideParticipantRating,
  decideParticipantRatings,
  eventNotRatable,
  ParticipantRatingState,
  RatedParticipantState,
} from './participant-rating';

const now = new Date('2026-11-01T12:00:00.000Z');
const yesterday = new Date('2026-10-31T17:00:00.000Z');
const tomorrow = new Date('2026-11-02T17:00:00.000Z');

const state = (
  overrides: Partial<ParticipantRatingState> = {},
): ParticipantRatingState => ({
  eventStatus: 'published',
  startsAt: yesterday,
  minParticipants: 4,
  approvedCount: 5,
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

  it('without an end: not on its day, from Prague midnight after it (#272)', () => {
    // 11:00 in Prague today; now is 13:00
    const thisMorning = new Date('2026-11-01T10:00:00.000Z');
    expect(
      decideParticipantRating(state({ startsAt: thisMorning }), now),
    ).toEqual({ ok: false, refusal: 'EVENT_NOT_ENDED' });
    // 00:00 on Monday 2. 11. in Prague (winter time, UTC+1)
    const midnight = new Date('2026-11-01T23:00:00.000Z');
    expect(
      decideParticipantRating(state({ startsAt: thisMorning }), midnight),
    ).toEqual({ ok: true });
  });

  it('within 14 Prague calendar days of the end: day 14 passes, the day before it is RATING_WINDOW_CLOSED (#66)', () => {
    // now is Sun 1. 11.: the window is open for an event that ended on Sun 18. 10. or later –
    // from Prague midnight, which is 22:00 UTC the day before (summer time), to the last moment
    const startOfDay14 = new Date('2026-10-17T22:00:00.000Z');
    expect(
      decideParticipantRating(state({ startsAt: startOfDay14 }), now),
    ).toEqual({ ok: true });
    expect(
      decideParticipantRating(
        state({ startsAt: new Date(startOfDay14.getTime() - 1) }),
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
    minParticipants: 4,
    approvedCount: 4,
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

  it('an event below its minimum did not take place: EVENT_NOT_HELD (#314)', () => {
    expect(eventNotRatable({ ...event, approvedCount: 3 }, now)).toBe(
      'EVENT_NOT_HELD',
    );
    // nobody at all
    expect(eventNotRatable({ ...event, approvedCount: 0 }, now)).toBe(
      'EVENT_NOT_HELD',
    );
    // exactly the minimum took place
    expect(eventNotRatable({ ...event, approvedCount: 4 }, now)).toBeNull();
    // before it ends nobody can tell, so it is not over yet
    expect(
      eventNotRatable({ ...event, approvedCount: 0, startsAt: tomorrow }, now),
    ).toBe('EVENT_NOT_ENDED');
  });
});

describe('decideParticipantRatings – several at once (#314)', () => {
  const event = {
    eventStatus: 'published' as const,
    startsAt: yesterday,
    endsAt: null,
    minParticipants: 2,
    approvedCount: 3,
    organizerUserId: 'u-petra',
  };
  const approved = (participantId: string): RatedParticipantState => ({
    participantId,
    participationStatus: 'approved' as const,
    ratingDeleted: false,
  });
  const deleted = { ...approved('u-eliska'), ratingDeleted: true };
  const closed = { ...event, startsAt: new Date('2026-10-01T12:00:00.000Z') };

  it('all approved participants of an event that can be rated: ok', () => {
    expect(
      decideParticipantRatings(
        event,
        'u-petra',
        [approved('u-jakub'), approved('u-lucie')],
        now,
      ),
    ).toEqual({ ok: true });
  });

  it('the window closed: RATING_WINDOW_CLOSED without a participant, whatever the order', () => {
    for (const list of [
      [deleted, approved('u-jakub')],
      [approved('u-jakub'), deleted],
    ]) {
      expect(decideParticipantRatings(closed, 'u-petra', list, now)).toEqual({
        ok: false,
        refusal: 'RATING_WINDOW_CLOSED',
      });
    }
  });

  it('who is not the organizer learns nothing more, whatever the event', () => {
    expect(decideParticipantRatings(closed, 'u-tomas', [deleted], now)).toEqual(
      { ok: false, refusal: 'NOT_ORGANIZER' },
    );
  });

  it('an event that can be rated: the first participant refused is named', () => {
    expect(
      decideParticipantRatings(
        event,
        'u-petra',
        [approved('u-jakub'), deleted, approved('u-petra')],
        now,
      ),
    ).toEqual({
      ok: false,
      refusal: 'RATING_DELETED',
      participantId: 'u-eliska',
    });
    expect(
      decideParticipantRatings(
        event,
        'u-petra',
        [
          approved('u-jakub'),
          { ...approved('u-tomas'), participationStatus: null },
        ],
        now,
      ),
    ).toEqual({ ok: false, refusal: 'NOT_APPROVED', participantId: 'u-tomas' });
  });

  it('an event that did not take place: EVENT_NOT_HELD for the whole list', () => {
    expect(
      decideParticipantRatings(
        { ...event, approvedCount: 1 },
        'u-petra',
        [approved('u-jakub')],
        now,
      ),
    ).toEqual({ ok: false, refusal: 'EVENT_NOT_HELD' });
  });
});

describe('RATING_DELETED: a different order for the event and for participants (review #314)', () => {
  // the same situation: the window closed, and the rating was deleted by a superadmin
  const closedEvent = {
    eventStatus: 'published' as const,
    startsAt: new Date('2026-10-01T12:00:00.000Z'),
    endsAt: null,
    minParticipants: 2,
    approvedCount: 3,
    organizerUserId: 'u-petra',
  };

  it('rating the event: the person hears it was deleted (#313)', () => {
    expect(
      decideEventRating(
        {
          ...closedEvent,
          raterId: 'u-jakub',
          participationStatus: 'approved',
          ratingDeleted: true,
        },
        now,
      ),
    ).toEqual({ ok: false, refusal: 'RATING_DELETED' });
  });

  it('rating participants: the whole list hears the window closed', () => {
    expect(
      decideParticipantRatings(
        closedEvent,
        'u-petra',
        [
          {
            participantId: 'u-jakub',
            participationStatus: 'approved',
            ratingDeleted: true,
          },
        ],
        now,
      ),
    ).toEqual({ ok: false, refusal: 'RATING_WINDOW_CLOSED' });
  });
});
