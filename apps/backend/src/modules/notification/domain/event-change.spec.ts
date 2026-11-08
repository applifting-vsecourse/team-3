import { EventSnapshot, summarizeChange } from './event-change';

const before: EventSnapshot = {
  startsAt: new Date('2026-11-11T17:00:00.000Z'),
  endsAt: null,
  address: 'Herna Karlín, Křižíkova 52, Praha 8',
  lat: 50.0928,
  lng: 14.4508,
  locality: { id: 'l-praha-8' },
};

describe('summarizeChange', () => {
  it('is null when neither time nor place changed', () => {
    expect(summarizeChange(before, { ...before })).toBeNull();
    // a different Date holding the same moment is no change
    expect(
      summarizeChange(before, {
        ...before,
        startsAt: new Date(before.startsAt.getTime()),
      }),
    ).toBeNull();
  });

  it('a new start is a change of the time only', () => {
    const startsAt = new Date('2026-11-12T17:00:00.000Z');

    expect(summarizeChange(before, { ...before, startsAt })).toEqual({
      when: {
        from: { startsAt: before.startsAt, endsAt: null },
        to: { startsAt, endsAt: null },
      },
      place: null,
    });
  });

  it('an end that was added or removed is a change of the time', () => {
    const endsAt = new Date('2026-11-11T19:00:00.000Z');

    expect(summarizeChange(before, { ...before, endsAt })?.when).toEqual({
      from: { startsAt: before.startsAt, endsAt: null },
      to: { startsAt: before.startsAt, endsAt },
    });
    expect(
      summarizeChange({ ...before, endsAt }, { ...before, endsAt: null })?.when,
    ).not.toBeNull();
  });

  it('a new address is a change of the place only', () => {
    expect(
      summarizeChange(before, { ...before, address: 'Louvre, Praha 1' }),
    ).toEqual({
      when: null,
      place: { from: before.address, to: 'Louvre, Praha 1' },
    });
  });

  it('a moved pin or another locality is a change of the place, even with the same address', () => {
    expect(summarizeChange(before, { ...before, lat: 50.1 })?.place).toEqual({
      from: before.address,
      to: before.address,
    });
    expect(
      summarizeChange(before, { ...before, locality: { id: 'l-praha-7' } })
        ?.place,
    ).not.toBeNull();
  });

  it('time and place together are both reported', () => {
    const change = summarizeChange(before, {
      ...before,
      startsAt: new Date('2026-11-12T17:00:00.000Z'),
      address: 'Louvre, Praha 1',
    });

    expect(change?.when).not.toBeNull();
    expect(change?.place).not.toBeNull();
  });
});
