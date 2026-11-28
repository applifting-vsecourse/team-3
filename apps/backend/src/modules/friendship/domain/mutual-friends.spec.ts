import {
  countMutualFriends,
  MUTUAL_FRIENDS_SHOWN_FROM,
  shownMutualFriends,
} from './mutual-friends';

describe('countMutualFriends (#473)', () => {
  it('counts my friends each person is friends with, whichever side asked', () => {
    const counts = countMutualFriends(
      ['f1', 'f2', 'f3'],
      [
        { requesterId: 'f1', addresseeId: 'p' },
        { requesterId: 'p', addresseeId: 'f2' },
        { requesterId: 'f3', addresseeId: 'q' },
      ],
      ['p', 'q', 'r'],
    );

    expect(counts).toEqual(
      new Map([
        ['p', 2],
        ['q', 1],
        ['r', 0],
      ]),
    );
  });

  it('a friendship of someone who isn’t my (active) friend doesn’t count', () => {
    const counts = countMutualFriends(
      ['f1'],
      [
        { requesterId: 'stranger', addresseeId: 'p' },
        { requesterId: 'f1', addresseeId: 'p' },
        { requesterId: 'f1', addresseeId: 'p' },
      ],
      ['p'],
    );

    expect(counts.get('p')).toBe(1);
  });
});

describe('shownMutualFriends (#473)', () => {
  it('null below 2, so a count of 1 never gives a friendship away', () => {
    expect(MUTUAL_FRIENDS_SHOWN_FROM).toBe(2);
    expect(shownMutualFriends(0)).toBeNull();
    expect(shownMutualFriends(1)).toBeNull();
    expect(shownMutualFriends(2)).toBe(2);
    expect(shownMutualFriends(25)).toBe(25);
  });
});
