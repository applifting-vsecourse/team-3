import { buildOrganizerRatingsWhere } from './organizer-ratings-where';

describe('buildOrganizerRatingsWhere', () => {
  const where = buildOrganizerRatingsWhere({
    userIds: ['u1'],
    groupIds: ['g1'],
  });

  it('leaves out deleted ratings and hidden or deleted events', () => {
    expect(where.deletedAt).toBeNull();
    expect(where.event).toMatchObject({
      status: { notIn: ['hidden', 'deleted'] },
    });
  });

  it("a person's rating only from their own events, a group's from the group's", () => {
    expect(where.event).toMatchObject({
      OR: [
        { groupId: null, organizerUserId: { in: ['u1'] } },
        { groupId: { in: ['g1'] } },
      ],
    });
  });
});
