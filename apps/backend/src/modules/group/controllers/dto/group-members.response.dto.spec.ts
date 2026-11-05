import { GroupMembersResponseDto } from './group-members.response.dto';

describe('GroupMembersResponseDto.fromDomain', () => {
  it('sends a request with its message, and nothing beyond the entry (#175)', () => {
    const since = new Date('2026-10-24T10:00:00.000Z');
    const withMore = {
      userId: 'u-jakub',
      name: 'Jakub Král',
      role: 'member' as const,
      since,
      message: 'Ahoj',
      email: 'jakub@example.com',
    };

    expect(
      GroupMembersResponseDto.fromDomain({
        requests: [withMore],
        members: [],
      }),
    ).toEqual({
      requests: [
        {
          userId: 'u-jakub',
          name: 'Jakub Král',
          role: 'member',
          since,
          message: 'Ahoj',
        },
      ],
      members: [],
    });
  });
});
