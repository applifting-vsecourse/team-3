import {
  decideParticipantRating,
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

  it('the organizer, joined to their own event (Q12), does not rate themselves', () => {
    expect(
      decideParticipantRating(state({ participantId: 'u-petra' }), now),
    ).toEqual({ ok: false, refusal: 'SELF_RATING' });
  });

  it('only someone who was approved', () => {
    for (const participationStatus of [
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
