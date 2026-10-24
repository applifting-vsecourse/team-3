import {
  Capacity,
  capacityChangeProblem,
  computeCapacity,
  matchesCapacity,
} from './capacity';

const limits = { minParticipants: 4, maxParticipants: 12 };

describe('computeCapacity', () => {
  it('nobody approved: the whole minimum is missing, all places free', () => {
    expect(computeCapacity(limits, 0)).toEqual({
      approvedCount: 0,
      missingToMin: 4,
      freeSpots: 12,
      isFull: false,
    });
  });

  it('one below the minimum: one person missing', () => {
    expect(computeCapacity(limits, 3)).toMatchObject({
      missingToMin: 1,
      freeSpots: 9,
      isFull: false,
    });
  });

  it('exactly at the minimum: nobody missing, still free places', () => {
    expect(computeCapacity(limits, 4)).toMatchObject({
      missingToMin: 0,
      freeSpots: 8,
      isFull: false,
    });
  });

  it('one place left is not full', () => {
    expect(computeCapacity(limits, 11)).toMatchObject({
      freeSpots: 1,
      isFull: false,
    });
  });

  it('at the maximum: full, no free places', () => {
    expect(computeCapacity(limits, 12)).toEqual({
      approvedCount: 12,
      missingToMin: 0,
      freeSpots: 0,
      isFull: true,
    });
  });

  it('over the maximum (e.g. lowered later): full, free places never negative', () => {
    expect(computeCapacity(limits, 13)).toMatchObject({
      freeSpots: 0,
      isFull: true,
    });
  });

  it('min equal to max: missing people until it is full', () => {
    const exact = { minParticipants: 4, maxParticipants: 4 };
    expect(computeCapacity(exact, 3)).toMatchObject({
      missingToMin: 1,
      freeSpots: 1,
      isFull: false,
    });
    expect(computeCapacity(exact, 4)).toMatchObject({
      missingToMin: 0,
      isFull: true,
    });
  });
});

describe('matchesCapacity', () => {
  const at = (approved: number): Capacity => computeCapacity(limits, approved);

  it('free: everything that is not full', () => {
    expect(
      [0, 3, 4, 11, 12].map((n) => matchesCapacity(at(n), 'free')),
    ).toEqual([true, true, true, true, false]);
  });

  it('missing: only below the minimum — a subset of free', () => {
    expect(
      [0, 3, 4, 11, 12].map((n) => matchesCapacity(at(n), 'missing')),
    ).toEqual([true, true, false, false, false]);
    for (let n = 0; n <= 13; n++) {
      if (matchesCapacity(at(n), 'missing')) {
        expect(matchesCapacity(at(n), 'free')).toBe(true);
      }
    }
  });
});

describe('capacityChangeProblem', () => {
  const current = { approvedCount: 5, minParticipants: 3, maxParticipants: 8 };

  it('the maximum can go down to the people already approved, not below', () => {
    expect(capacityChangeProblem(current, { maxParticipants: 5 })).toBeNull();
    expect(capacityChangeProblem(current, { maxParticipants: 4 })).toBe(
      'Maximum nejde snížit pod počet přihlášených (5).',
    );
  });

  it('max below min is refused, also when only one of them changes', () => {
    expect(capacityChangeProblem(current, { minParticipants: 9 })).toBe(
      'Maximum nesmí být menší než minimum.',
    );
    expect(
      capacityChangeProblem(current, {
        minParticipants: 2,
        maxParticipants: 6,
      }),
    ).toBeNull();
  });

  it('no change to the limits is fine', () => {
    expect(capacityChangeProblem(current, {})).toBeNull();
  });
});
