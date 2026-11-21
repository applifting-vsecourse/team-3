import {
  decideReject,
  decideRemove,
  decideRequest,
  friendshipPairKey,
  friendshipState,
  type FriendshipRow,
  type FriendshipStatus,
} from './friendship';

const A = 'user-a';
const B = 'user-b';
const fromAtoB = (status: FriendshipStatus): FriendshipRow => ({
  requesterId: A,
  addresseeId: B,
  status,
});

describe('friendshipPairKey', () => {
  it('is the same whoever asks, so the unique index keeps one row per pair', () => {
    expect(friendshipPairKey(A, B)).toBe(friendshipPairKey(B, A));
    expect(friendshipPairKey(B, A)).toBe('user-a:user-b');
  });
});

describe('friendshipState (Figma B-07 · Stavy tlačítka přátelství)', () => {
  it.each([
    ['nothing between them', null, A, 'none'],
    ['my request waits', fromAtoB('pending'), A, 'outgoing'],
    ['their request waits for me', fromAtoB('pending'), B, 'incoming'],
    ['accepted, for both', fromAtoB('accepted'), A, 'friends'],
    ['accepted, the other side', fromAtoB('accepted'), B, 'friends'],
    // decided 18. 11.: the rejection is silent
    ['rejected, for the one who asked', fromAtoB('rejected'), A, 'outgoing'],
    ['rejected, for the one who rejected', fromAtoB('rejected'), B, 'none'],
  ] as const)('%s', (_case, row, viewer, expected) => {
    const other = viewer === A ? B : A;
    expect(friendshipState(row, viewer, other)).toBe(expected);
  });

  it('my own profile', () => {
    expect(friendshipState(null, A, A)).toBe('self');
  });
});

describe('decideRequest („Přidat do přátel“)', () => {
  it('a new request when there is nothing', () => {
    expect(decideRequest(null, A, B)).toEqual({ ok: true, action: 'create' });
  });

  it('accepts when the other already asks me: one row per pair', () => {
    expect(decideRequest(fromAtoB('pending'), B, A)).toEqual({
      ok: true,
      action: 'accept',
    });
  });

  it('the one who rejected may later ask themselves', () => {
    expect(decideRequest(fromAtoB('rejected'), B, A)).toEqual({
      ok: true,
      action: 'resend',
    });
  });

  it.each([
    ['to myself', null, A, A, 'SELF'],
    ['already friends', fromAtoB('accepted'), A, B, 'ALREADY_FRIENDS'],
    ['my request still waits', fromAtoB('pending'), A, B, 'ALREADY_REQUESTED'],
    // silent: asking again looks like the request is still there
    [
      'after a silent rejection',
      fromAtoB('rejected'),
      A,
      B,
      'ALREADY_REQUESTED',
    ],
  ] as const)('refused %s', (_case, row, viewer, other, refusal) => {
    expect(decideRequest(row, viewer, other)).toEqual({ ok: false, refusal });
  });
});

describe('decideReject („Odmítnout“)', () => {
  it('a request waiting for me', () => {
    expect(decideReject(fromAtoB('pending'), B, A)).toEqual({ ok: true });
  });

  it.each([
    ['my own request', fromAtoB('pending'), A, B],
    ['nothing', null, B, A],
    ['already friends', fromAtoB('accepted'), B, A],
    ['already rejected', fromAtoB('rejected'), B, A],
  ] as const)('nothing to reject: %s', (_case, row, viewer, other) => {
    expect(decideReject(row, viewer, other)).toEqual({
      ok: false,
      refusal: 'NO_REQUEST',
    });
  });

  it('not myself', () => {
    expect(decideReject(null, A, A)).toEqual({ ok: false, refusal: 'SELF' });
  });
});

describe('decideRemove („Zrušit žádost“, „Odebrat z přátel“)', () => {
  it('cancels my waiting request', () => {
    expect(decideRemove(fromAtoB('pending'), A, B)).toEqual({
      ok: true,
      action: 'cancel',
    });
  });

  it('cancels it after a silent rejection too, so it can be sent again (18. 11.)', () => {
    expect(decideRemove(fromAtoB('rejected'), A, B)).toEqual({
      ok: true,
      action: 'cancel',
    });
  });

  it.each([A, B])('unfriends, from either side (%s)', (viewer) => {
    const other = viewer === A ? B : A;
    expect(decideRemove(fromAtoB('accepted'), viewer, other)).toEqual({
      ok: true,
      action: 'unfriend',
    });
  });

  it.each([
    // a request waiting for me is rejected, not deleted
    ['a request waiting for me', fromAtoB('pending'), B, A],
    ['a request I rejected', fromAtoB('rejected'), B, A],
    ['nothing', null, A, B],
  ] as const)('nothing to remove: %s', (_case, row, viewer, other) => {
    expect(decideRemove(row, viewer, other)).toEqual({
      ok: false,
      refusal: 'NO_FRIENDSHIP',
    });
  });
});
