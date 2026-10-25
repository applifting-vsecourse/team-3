import { buildMyGroupsWhere } from './my-groups-where';

describe('buildMyGroupsWhere', () => {
  it('active groups where I am a member or wait for approval', () => {
    expect(buildMyGroupsWhere('u-jakub')).toEqual({
      status: 'active',
      members: {
        some: { userId: 'u-jakub', status: { in: ['active', 'pending'] } },
      },
    });
  });

  it('leaves out deactivated groups and blocked memberships', () => {
    const where = buildMyGroupsWhere('u-jakub');
    expect(where.status).toBe('active');
    expect(JSON.stringify(where)).not.toMatch(/blocked|inactive/);
  });
});
