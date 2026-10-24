import { decideJoin, decideLeave, JoinState } from './participation';

const now = new Date('2026-10-24T08:00:00.000Z');
const tomorrow = new Date('2026-10-25T16:00:00.000Z');

const state = (overrides: Partial<JoinState> = {}): JoinState => ({
  eventStatus: 'published',
  startsAt: tomorrow,
  approvalMode: 'open',
  maxParticipants: 6,
  isOrganizer: false,
  existingStatus: null,
  approvedCount: 2,
  ...overrides,
});

describe('decideJoin', () => {
  it('an event without approval: joined at once', () => {
    expect(decideJoin(state(), now)).toEqual({ ok: true, status: 'approved' });
  });

  it('the last place can be taken; a full event refuses EVENT_FULL', () => {
    expect(decideJoin(state({ approvedCount: 5 }), now)).toMatchObject({
      ok: true,
    });
    expect(decideJoin(state({ approvedCount: 6 }), now)).toEqual({
      ok: false,
      refusal: 'EVENT_FULL',
    });
  });

  it('not twice: an approved or pending participation refuses ALREADY_JOINED', () => {
    for (const existingStatus of ['approved', 'pending'] as const) {
      expect(decideJoin(state({ existingStatus }), now)).toEqual({
        ok: false,
        refusal: 'ALREADY_JOINED',
      });
    }
  });

  it('who withdrew may come back; who was rejected or removed may not', () => {
    expect(decideJoin(state({ existingStatus: 'withdrawn' }), now)).toEqual({
      ok: true,
      status: 'approved',
    });
    for (const existingStatus of ['rejected', 'removed'] as const) {
      expect(decideJoin(state({ existingStatus }), now)).toEqual({
        ok: false,
        refusal: 'PARTICIPATION_REFUSED',
      });
    }
  });

  it('not on a cancelled event, nor one that started (or starts now)', () => {
    expect(decideJoin(state({ eventStatus: 'cancelled' }), now)).toEqual({
      ok: false,
      refusal: 'EVENT_CANCELLED',
    });
    expect(decideJoin(state({ startsAt: now }), now)).toEqual({
      ok: false,
      refusal: 'EVENT_STARTED',
    });
  });

  it('with approval, a participant waits for the organizer (pending, #53)', () => {
    expect(decideJoin(state({ approvalMode: 'approval' }), now)).toEqual({
      ok: true,
      status: 'pending',
    });
    // a request takes no place, so it is allowed on a full event
    expect(
      decideJoin(state({ approvalMode: 'approval', approvedCount: 6 }), now),
    ).toEqual({ ok: true, status: 'pending' });
  });

  it('the organizer joins approved even with approval, and counts towards the capacity (Q12)', () => {
    expect(
      decideJoin(state({ approvalMode: 'approval', isOrganizer: true }), now),
    ).toEqual({ ok: true, status: 'approved' });
    expect(
      decideJoin(state({ isOrganizer: true, approvedCount: 6 }), now),
    ).toEqual({ ok: false, refusal: 'EVENT_FULL' });
  });
});

describe('decideLeave', () => {
  it('a participant or a waiting request can leave before the start', () => {
    for (const existingStatus of ['approved', 'pending'] as const) {
      expect(decideLeave({ startsAt: tomorrow, existingStatus }, now)).toEqual({
        ok: true,
      });
    }
  });

  it('not after the start', () => {
    expect(
      decideLeave({ startsAt: now, existingStatus: 'approved' }, now),
    ).toEqual({ ok: false, refusal: 'EVENT_STARTED' });
  });

  it('someone who is not in cannot leave', () => {
    for (const existingStatus of [null, 'withdrawn', 'rejected'] as const) {
      expect(decideLeave({ startsAt: tomorrow, existingStatus }, now)).toEqual({
        ok: false,
        refusal: 'NOT_JOINED',
      });
    }
  });
});
