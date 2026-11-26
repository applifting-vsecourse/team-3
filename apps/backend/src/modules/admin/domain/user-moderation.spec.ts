import { decideBlock, decideUnblock } from './user-moderation';

const user = { role: 'user', blockedAt: null, isSelf: false };

describe('decideBlock (PO 26. 11.)', () => {
  it('blocks a regular user once', () => {
    expect(decideBlock(user)).toEqual({ ok: true });
    expect(decideBlock({ ...user, blockedAt: new Date() })).toEqual({
      ok: false,
      refusal: 'USER_ALREADY_BLOCKED',
    });
  });

  it('never oneself nor another superadmin', () => {
    expect(decideBlock({ ...user, isSelf: true })).toEqual({
      ok: false,
      refusal: 'CANNOT_BLOCK_SELF',
    });
    expect(decideBlock({ ...user, role: 'admin' })).toEqual({
      ok: false,
      refusal: 'CANNOT_BLOCK_ADMIN',
    });
  });
});

describe('decideUnblock', () => {
  it('only a blocked user', () => {
    expect(decideUnblock({ ...user, blockedAt: new Date() })).toEqual({
      ok: true,
    });
    expect(decideUnblock(user)).toEqual({
      ok: false,
      refusal: 'USER_NOT_BLOCKED',
    });
  });
});
