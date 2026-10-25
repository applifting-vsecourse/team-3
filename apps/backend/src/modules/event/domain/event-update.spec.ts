import { decideUpdate, lifecycleRefusal, UpdateState } from './event-update';

const now = new Date('2026-10-23T08:00:00.000Z');

const aState = (overrides: Partial<UpdateState> = {}): UpdateState => ({
  status: 'published',
  // Saturday 18:00–21:00 Prague time
  startsAt: new Date('2026-10-24T16:00:00.000Z'),
  endsAt: new Date('2026-10-24T19:00:00.000Z'),
  minParticipants: 3,
  maxParticipants: 6,
  approvedCount: 2,
  ...overrides,
});

describe('decideUpdate', () => {
  it('writes the changes as they are when the start stays', () => {
    expect(
      decideUpdate(aState(), { title: 'Deskovky ve středu' }, now),
    ).toEqual({ ok: true, data: { title: 'Deskovky ve středu' } });
  });

  it('moving the start moves the end too, keeping the duration', () => {
    const sunday = new Date('2026-10-25T17:00:00.000Z');

    expect(decideUpdate(aState(), { startsAt: sunday }, now)).toEqual({
      ok: true,
      data: { startsAt: sunday, endsAt: new Date('2026-10-25T20:00:00.000Z') },
    });
  });

  it('an event without an end stays without one', () => {
    const sunday = new Date('2026-10-25T17:00:00.000Z');

    expect(
      decideUpdate(aState({ endsAt: null }), { startsAt: sunday }, now),
    ).toEqual({ ok: true, data: { startsAt: sunday } });
  });

  it('a cancelled event refuses any change, even one that came before the cancel', () => {
    expect(
      decideUpdate(aState({ status: 'cancelled' }), { title: 'x' }, now),
    ).toEqual({ ok: false, refusal: { code: 'EVENT_CANCELLED' } });
  });

  it('a started event refuses any change', () => {
    expect(
      decideUpdate(aState({ startsAt: now }), { title: 'x' }, now),
    ).toEqual({ ok: false, refusal: { code: 'EVENT_STARTED' } });
  });

  it('the maximum below the approved is refused with the count', () => {
    expect(
      decideUpdate(aState({ approvedCount: 5 }), { maxParticipants: 4 }, now),
    ).toEqual({
      ok: false,
      refusal: {
        code: 'INVALID_CAPACITY',
        problem: 'Maximum nejde snížit pod počet přihlášených (5).',
      },
    });
  });

  describe('an end the organizer sets', () => {
    const state = aState();

    it('is written as sent when it comes after the start', () => {
      const endsAt = new Date(state.startsAt.getTime() + 3 * 3600_000);

      expect(decideUpdate(state, { endsAt }, now)).toEqual({
        ok: true,
        data: { endsAt },
      });
    });

    it('can be cleared', () => {
      expect(decideUpdate(state, { endsAt: null }, now)).toEqual({
        ok: true,
        data: { endsAt: null },
      });
    });

    it('is refused when it is not after the stored start', () => {
      expect(decideUpdate(state, { endsAt: state.startsAt }, now)).toEqual({
        ok: false,
        refusal: { code: 'INVALID_END', problem: 'Konec musí být po začátku.' },
      });
    });

    it('is checked against a start moved in the same change, and not shifted', () => {
      const startsAt = new Date('2026-10-25T17:00:00.000Z');
      const endsAt = new Date('2026-10-25T16:00:00.000Z');

      expect(decideUpdate(state, { startsAt, endsAt }, now)).toEqual({
        ok: false,
        refusal: { code: 'INVALID_END', problem: 'Konec musí být po začátku.' },
      });
      const later = new Date('2026-10-25T21:00:00.000Z');
      expect(decideUpdate(state, { startsAt, endsAt: later }, now)).toEqual({
        ok: true,
        data: { startsAt, endsAt: later },
      });
    });
  });
});

describe('lifecycleRefusal', () => {
  it('lets a published future event change', () => {
    expect(lifecycleRefusal(aState(), now)).toBeNull();
  });
});
