import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { GroupRepository } from './group.repository';

describe('GroupRepository', () => {
  describe('deactivateGroup (B-051, B-055)', () => {
    it("cancels the group's upcoming events with the reason; past ones stay", async () => {
      const prisma = mockDeep<PrismaService>();
      const at = new Date('2026-11-07T10:00:00.000Z');

      await new GroupRepository(prisma).deactivateGroup('g1', at);

      expect(prisma.event.updateMany).toHaveBeenCalledWith({
        where: { groupId: 'g1', status: 'published', startsAt: { gt: at } },
        data: {
          status: 'cancelled',
          cancelReason: 'Skupina už není aktivní',
          cancelledAt: at,
        },
      });
      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { status: 'inactive', deactivatedAt: at },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

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

  describe('findMyGroups (#304)', () => {
    it('asks for no counts when I run no group', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.group.findMany.mockResolvedValue([] as never);

      await new GroupRepository(prisma).findMyGroups('u1');

      expect(prisma.groupMember.groupBy).not.toHaveBeenCalled();
    });

    const row = (id: string, members: object[]): object => ({
      id,
      name: `Skupina ${id}`,
      type: 'closed',
      activity: {
        id: 'a1',
        slug: 'volejbal',
        name: 'Volejbal',
        category: { id: 'c1', slug: 'sport', name: 'Sport', icon: 'ball' },
      },
      locality: { id: 'l1', slug: 'praha-7', name: 'Praha 7' },
      _count: { members: 6 },
      members,
    });

    it('counts the requests waiting in a group I run, none in a group I am only in', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.group.findMany.mockResolvedValue([
        row('g-admin', [{ role: 'admin', status: 'active' }]),
        row('g-member', [{ role: 'member', status: 'active' }]),
        row('g-asked', [{ role: 'member', status: 'pending' }]),
      ] as never);
      // groupBy's generic overloads are too deep for jest-mock-extended's types
      const groupBy = prisma.groupMember.groupBy as unknown as jest.Mock;
      groupBy.mockResolvedValue([
        { groupId: 'g-admin', _count: { _all: 1 } },
      ] as never);

      const groups = await new GroupRepository(prisma).findMyGroups('u1');

      // counted by the database, and only in the groups I run
      expect(prisma.groupMember.groupBy).toHaveBeenCalledWith({
        by: ['groupId'],
        where: { groupId: { in: ['g-admin'] }, status: 'pending' },
        _count: { _all: true },
      });

      expect(
        groups.map(({ id, membership, pendingRequests }) => ({
          id,
          membership,
          pendingRequests,
        })),
      ).toEqual([
        {
          id: 'g-admin',
          membership: { role: 'admin', status: 'active' },
          pendingRequests: 1,
        },
        {
          id: 'g-member',
          membership: { role: 'member', status: 'active' },
          pendingRequests: null,
        },
        {
          id: 'g-asked',
          membership: { role: 'member', status: 'pending' },
          pendingRequests: null,
        },
      ]);
    });
  });

  describe('findRecruitingGroups (#182)', () => {
    const now = new Date('2026-11-07T10:00:00.000Z');
    const row = (id: string, events: { startsAt: Date }[]): object => ({
      id,
      name: `Skupina ${id}`,
      type: 'closed',
      activity: {
        id: 'a1',
        slug: 'volejbal',
        name: 'Volejbal',
        category: { id: 'c1', slug: 'sport', name: 'Sport', icon: 'ball' },
      },
      locality: { id: 'l1', slug: 'praha-3', name: 'Praha 3' },
      _count: { members: 4 },
      events,
    });

    it('asks for the next upcoming event and returns its start with the summary', async () => {
      const prisma = mockDeep<PrismaService>();
      const next = new Date('2026-11-08T16:00:00.000Z');
      prisma.group.findMany.mockResolvedValue([
        row('g1', [{ startsAt: next }]),
        row('g2', []),
      ] as never);

      const groups = await new GroupRepository(prisma).findRecruitingGroups({
        localityId: 'l-praha',
        viewerId: 'u1',
        now,
        limit: 50,
      });

      expect(groups).toEqual([
        expect.objectContaining({
          id: 'g1',
          memberCount: 4,
          nextEventAt: next,
        }),
      ]);
      const args = prisma.group.findMany.mock.calls[0][0];
      expect(args?.include?.events).toEqual({
        where: { status: 'published', startsAt: { gt: now } },
        select: { startsAt: true },
        orderBy: { startsAt: 'asc' },
        take: 1,
      });
      expect(args?.take).toBe(50);
      // no member names nor anything else about people
      expect(JSON.stringify(args?.include)).not.toMatch(/user/);
    });
  });

  describe('createAnnouncement (#194)', () => {
    const since = new Date('2026-11-07T23:00:00.000Z');
    const input = { subject: 'Pauza', body: 'Přes svátky se nehraje.' };
    const created = {
      id: 'an1',
      ...input,
      createdAt: since,
      sender: { id: 'u1', name: 'Petra' },
    };

    const setup = (state: {
      status: 'active' | 'inactive';
      sentToday: number;
    }): ReturnType<typeof mockDeep<PrismaService>> => {
      const prisma = mockDeep<PrismaService>();
      // the callback form: the mock itself stands in for the transaction client
      prisma.$transaction.mockImplementation(((
        run: (tx: typeof prisma) => unknown,
      ) => run(prisma)) as never);
      prisma.group.findUniqueOrThrow.mockResolvedValue({
        status: state.status,
      } as never);
      prisma.groupAnnouncement.count.mockResolvedValue(state.sentToday);
      prisma.groupAnnouncement.create.mockResolvedValue(created as never);
      return prisma;
    };

    it("locks the group, counts today's and writes when the decision allows", async () => {
      const prisma = setup({ status: 'active', sentToday: 9 });
      const decide = jest.fn().mockReturnValue({ ok: true });

      await expect(
        new GroupRepository(prisma).createAnnouncement(
          'g1',
          'u1',
          input,
          since,
          decide,
        ),
      ).resolves.toEqual({ ok: true, announcement: created });
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.groupAnnouncement.count).toHaveBeenCalledWith({
        where: { groupId: 'g1', createdAt: { gte: since } },
      });
      expect(decide).toHaveBeenCalledWith({
        groupStatus: 'active',
        sentToday: 9,
      });
      expect(prisma.groupAnnouncement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { groupId: 'g1', senderId: 'u1', ...input },
        }),
      );
    });

    it('writes nothing when the decision refuses', async () => {
      const prisma = setup({ status: 'active', sentToday: 10 });

      await expect(
        new GroupRepository(prisma).createAnnouncement(
          'g1',
          'u1',
          input,
          since,
          () => ({ ok: false, refusal: 'ANNOUNCEMENT_LIMIT' }),
        ),
      ).resolves.toEqual({ ok: false, refusal: 'ANNOUNCEMENT_LIMIT' });
      expect(prisma.groupAnnouncement.create).not.toHaveBeenCalled();
    });
  });
});

describe('GroupRepository: findGroupById admins (#289)', () => {
  it("are the admins' users, so their id is the one their public profile has", async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.group.findUnique.mockResolvedValue({
      id: 'g1',
      name: 'Deskovky Vinohrady',
      type: 'public',
      description: null,
      status: 'active',
      activity: {
        id: 'a1',
        slug: 'deskove-hry',
        name: 'Deskové hry',
        category: { id: 'c1', slug: 'hry', name: 'Hry', icon: 'dices' },
      },
      locality: { id: 'l1', slug: 'praha-2', name: 'Praha 2' },
      _count: { members: 2 },
      // a membership row has an id of its own; the profile needs the user's
      members: [
        { id: 'membership-1', user: { id: 'u1', name: 'Petra Nováková' } },
      ],
    } as never);

    const group = await new GroupRepository(prisma).findGroupById('g1');

    expect(group?.admins).toEqual([{ id: 'u1', name: 'Petra Nováková' }]);
    expect(prisma.group.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          members: expect.objectContaining({
            where: { role: 'admin', status: 'active' },
            select: { user: { select: { id: true, name: true } } },
          }),
        }),
      }),
    );
  });
});
