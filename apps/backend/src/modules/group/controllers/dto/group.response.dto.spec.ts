import type { GroupDetail } from '@/modules/group/domain/group';
import { GroupDetailResponseDto } from './group.response.dto';

const group: GroupDetail = {
  id: 'g1',
  name: 'Deskovky Vinohrady',
  type: 'public',
  activity: {
    id: 'a1',
    slug: 'deskove-hry',
    name: 'Deskové hry',
    category: { id: 'c1', slug: 'hry', name: 'Hry', icon: 'dices' },
  },
  locality: { id: 'l1', slug: 'praha-2', name: 'Praha 2' },
  memberCount: 3,
  description: null,
  status: 'active',
  admins: [{ id: 'u1', name: 'Petra Nováková' }],
  viewerMembership: null,
};

describe('GroupDetailResponseDto.fromDomain', () => {
  it("sends each admin's user id and name, for a link to the public profile (#289)", () => {
    const withMore = {
      id: 'u2',
      name: 'Jakub Král',
      email: 'jakub@example.com',
    };

    expect(
      GroupDetailResponseDto.fromDomain({
        ...group,
        admins: [...group.admins, withMore],
      }).admins,
    ).toEqual([
      { id: 'u1', name: 'Petra Nováková' },
      { id: 'u2', name: 'Jakub Král' },
    ]);
  });
});
