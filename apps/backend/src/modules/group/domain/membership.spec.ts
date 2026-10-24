import { decideJoin, decideLeave, decideRequest } from './membership';

const active = { status: 'active' as const };

describe('decideJoin', () => {
  it('a public group takes the user in at once', () => {
    expect(decideJoin({ ...active, type: 'public' }, null)).toEqual({
      kind: 'create',
      status: 'active',
    });
  });

  it('a closed group records a request', () => {
    expect(decideJoin({ ...active, type: 'closed' }, null)).toEqual({
      kind: 'create',
      status: 'pending',
    });
  });

  it('asking again changes nothing', () => {
    expect(
      decideJoin(
        { ...active, type: 'closed' },
        { role: 'member', status: 'pending' },
      ),
    ).toEqual({ kind: 'unchanged', status: 'pending' });
    expect(
      decideJoin(
        { ...active, type: 'public' },
        { role: 'admin', status: 'active' },
      ),
    ).toEqual({ kind: 'unchanged', status: 'active' });
  });

  it('a blocked user can not join again', () => {
    expect(
      decideJoin(
        { ...active, type: 'public' },
        { role: 'member', status: 'blocked' },
      ),
    ).toEqual({ kind: 'error', error: 'MEMBER_BLOCKED' });
  });

  it('nobody joins a deactivated group', () => {
    expect(decideJoin({ status: 'inactive', type: 'public' }, null)).toEqual({
      kind: 'error',
      error: 'GROUP_INACTIVE',
    });
  });
});

describe('decideLeave', () => {
  it('a member and a pending request can leave', () => {
    expect(decideLeave({ role: 'member', status: 'active' }, 1)).toEqual({
      kind: 'delete',
    });
    expect(decideLeave({ role: 'member', status: 'pending' }, 1)).toEqual({
      kind: 'delete',
    });
  });

  it('the last admin can not leave', () => {
    expect(decideLeave({ role: 'admin', status: 'active' }, 1)).toEqual({
      kind: 'error',
      error: 'LAST_ADMIN',
    });
  });

  it('an admin can leave while another admin stays', () => {
    expect(decideLeave({ role: 'admin', status: 'active' }, 2)).toEqual({
      kind: 'delete',
    });
  });

  it('nobody leaves what they are not in, and a block stays', () => {
    expect(decideLeave(null, 1)).toEqual({
      kind: 'error',
      error: 'NOT_MEMBER',
    });
    expect(decideLeave({ role: 'member', status: 'blocked' }, 1)).toEqual({
      kind: 'error',
      error: 'NOT_MEMBER',
    });
  });
});

describe('decideRequest', () => {
  it('only a pending request can be approved or rejected', () => {
    expect(decideRequest({ role: 'member', status: 'pending' })).toEqual({
      kind: 'ok',
    });
    expect(decideRequest({ role: 'member', status: 'active' })).toEqual({
      kind: 'error',
      error: 'NOT_PENDING',
    });
    expect(decideRequest(null)).toEqual({
      kind: 'error',
      error: 'NOT_PENDING',
    });
  });
});
