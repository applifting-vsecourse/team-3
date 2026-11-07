import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { GroupRepository } from './group.repository';

describe('GroupRepository', () => {
  describe('createMembership (#175)', () => {
    it('a request keeps its message', async () => {
      const prisma = mockDeep<PrismaService>();

      await new GroupRepository(prisma).createMembership(
        'g1',
        'u1',
        'pending',
        'Ahoj',
      );

      expect(prisma.groupMember.create).toHaveBeenCalledWith({
        data: {
          groupId: 'g1',
          userId: 'u1',
          role: 'member',
          status: 'pending',
          message: 'Ahoj',
        },
      });
    });

    it('joining a public group at once keeps none', async () => {
      const prisma = mockDeep<PrismaService>();

      await new GroupRepository(prisma).createMembership(
        'g1',
        'u1',
        'active',
        'Ahoj',
      );

      expect(prisma.groupMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'active', message: null }),
      });
    });
  });

  describe('findMembers (#175)', () => {
    it('a request comes with its message, a member without the old one', async () => {
      const prisma = mockDeep<PrismaService>();
      const at = new Date('2026-10-24T10:00:00.000Z');
      prisma.groupMember.findMany.mockResolvedValue([
        {
          role: 'member',
          status: 'pending',
          createdAt: at,
          message: 'Ahoj, hraju rád.',
          user: { id: 'u-jakub', name: 'Jakub Král' },
        },
        {
          role: 'member',
          status: 'active',
          createdAt: at,
          message: 'Stará zpráva z žádosti',
          user: { id: 'u-petr', name: 'Petr Holub' },
        },
      ] as never);

      await expect(
        new GroupRepository(prisma).findMembers('g1'),
      ).resolves.toEqual({
        requests: [
          {
            userId: 'u-jakub',
            name: 'Jakub Král',
            role: 'member',
            since: at,
            message: 'Ahoj, hraju rád.',
          },
        ],
        members: [
          {
            userId: 'u-petr',
            name: 'Petr Holub',
            role: 'member',
            since: at,
            message: null,
          },
        ],
      });
    });
  });
});

describe('GroupRepository: the request message stays with the admins (#175)', () => {
  it('the list, the group page and Moje skupiny never load it', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.group.findMany.mockResolvedValue([]);
    prisma.group.findUnique.mockResolvedValue(null);
    prisma.groupMember.findUnique.mockResolvedValue(null);
    const repository = new GroupRepository(prisma);

    await repository.findActiveGroups({ filters: {}, limit: 10 });
    await repository.findMyGroups('u1');
    await repository.findGroupById('g1', 'u1');
    await repository.findMembership('g1', 'u1');

    expect(
      JSON.stringify([
        prisma.group.findMany.mock.calls,
        prisma.group.findUnique.mock.calls,
        prisma.groupMember.findUnique.mock.calls,
      ]),
    ).not.toContain('message');
  });
});
