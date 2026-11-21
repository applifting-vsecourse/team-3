import {
  friendLists,
  type FriendPersonRecord,
  type FriendshipRecord,
} from './friend-list';
import type { FriendshipStatus } from './friendship';

const ME = 'me';
const aPerson = (
  id: string,
  name: string,
  overrides: Partial<FriendPersonRecord> = {},
): FriendPersonRecord => ({
  id,
  name,
  deletedAt: null,
  blockedAt: null,
  interests: [{ activity: { id: 'a1', name: 'Volejbal' } }],
  ...overrides,
});
const me = aPerson(ME, 'Jakub Král');
const aRow = (
  requester: FriendPersonRecord,
  addressee: FriendPersonRecord,
  status: FriendshipStatus,
  createdAt = '2026-11-17T10:00:00.000Z',
): FriendshipRecord => ({
  requesterId: requester.id,
  addresseeId: addressee.id,
  status,
  createdAt: new Date(createdAt),
  requester,
  addressee,
});

describe('friendLists („Lidé, které znám“, #307)', () => {
  it('sorts friends from both sides by name in Czech order, with their interests', () => {
    const lists = friendLists(
      [
        aRow(me, aPerson('p', 'Petra Nováková'), 'accepted'),
        aRow(aPerson('c', 'Čeněk Malý'), me, 'accepted'),
        aRow(me, aPerson('h', 'Hana Dvořáková'), 'accepted'),
        aRow(me, aPerson('ch', 'Christian Bauer'), 'accepted'),
      ],
      ME,
    );

    // Czech: „Ch“ comes after „H“, „Č“ after „C“
    expect(lists.friends.map((person) => person.name)).toEqual([
      'Čeněk Malý',
      'Hana Dvořáková',
      'Christian Bauer',
      'Petra Nováková',
    ]);
    expect(lists.friends[0]).toEqual({
      id: 'c',
      name: 'Čeněk Malý',
      interests: [{ id: 'a1', name: 'Volejbal' }],
    });
  });

  it('puts requests waiting for me apart from mine, the newest first', () => {
    const lists = friendLists(
      [
        aRow(aPerson('t', 'Tomáš'), me, 'pending', '2026-11-15T10:00:00.000Z'),
        aRow(aPerson('a', 'Adam'), me, 'pending', '2026-11-17T10:00:00.000Z'),
        aRow(me, aPerson('s', 'Simona'), 'pending', '2026-11-16T10:00:00.000Z'),
      ],
      ME,
    );

    expect(lists.incoming.map((request) => request.person.name)).toEqual([
      'Adam',
      'Tomáš',
    ]);
    expect(lists.incoming[0]?.requestedAt).toEqual(
      new Date('2026-11-17T10:00:00.000Z'),
    );
    expect(lists.outgoing.map((request) => request.person.name)).toEqual([
      'Simona',
    ]);
    expect(lists.friends).toEqual([]);
  });

  it('a silent rejection: still my request for me, nothing for the one who rejected (18. 11.)', () => {
    const rejected = aRow(me, aPerson('s', 'Simona'), 'rejected');

    expect(friendLists([rejected], ME).outgoing).toHaveLength(1);
    expect(friendLists([rejected], 's')).toEqual({
      friends: [],
      incoming: [],
      outgoing: [],
    });
  });

  it.each([
    ['deleted', { deletedAt: new Date('2026-11-01T00:00:00.000Z') }],
    ['blocked', { blockedAt: new Date('2026-11-01T00:00:00.000Z') }],
  ])('leaves out a %s account', (_case, overrides) => {
    const gone = aPerson('x', 'Xaver', overrides);
    const lists = friendLists(
      [aRow(me, gone, 'accepted'), aRow(gone, me, 'pending')],
      ME,
    );

    expect(lists).toEqual({ friends: [], incoming: [], outgoing: [] });
  });
});
