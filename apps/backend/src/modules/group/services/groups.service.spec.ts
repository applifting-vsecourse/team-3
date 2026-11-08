import { GroupDetail, GroupInput } from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { NotificationService } from '@/modules/notification/services/notification.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { GROUPS_LIMIT, GroupsService } from './groups.service';

const input: GroupInput = {
  name: 'Deskovky Holešovice',
  description: null,
  activityId: 'a-deskove-hry',
  localityId: 'l-praha-7',
  type: 'closed',
};

const aGroup = (id: string): GroupDetail => ({
  id,
  name: input.name,
  type: input.type,
  activity: {
    id: 'a-deskove-hry',
    slug: 'deskove-hry',
    name: 'Deskové hry',
    category: { id: 'c-hry', slug: 'hry', name: 'Hry', icon: 'dice' },
  },
  locality: { id: 'l-praha-7', slug: 'praha-7', name: 'Praha 7' },
  memberCount: 1,
  description: null,
  status: 'active',
  admins: [{ id: 'u-petra', name: 'Petra' }],
  viewerMembership: null,
});

const setup = (): {
  repository: MockProxy<GroupRepository>;
  notifications: MockProxy<NotificationService>;
  service: GroupsService;
} => {
  const repository = mock<GroupRepository>();
  repository.catalogHas.mockResolvedValue({ activity: true, locality: true });
  const notifications = mock<NotificationService>();
  return {
    repository,
    notifications,
    service: new GroupsService(repository, notifications),
  };
};

describe('GroupsService', () => {
  it('lists active groups with the filters and the limit', async () => {
    const { repository, service } = setup();
    repository.findActiveGroups.mockResolvedValue([aGroup('g1')]);
    const filters = { localityId: 'l-praha', activityIds: ['a-florbal'] };

    await expect(service.getActiveGroups(filters)).resolves.toHaveLength(1);
    expect(repository.findActiveGroups).toHaveBeenCalledWith({
      filters,
      limit: GROUPS_LIMIT,
    });
  });

  it('an unknown group is a 404', async () => {
    const { repository, service } = setup();
    repository.findGroupById.mockResolvedValue(null);

    await expect(service.getGroup('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('createGroup', () => {
    it('creates the group with the founder and returns it', async () => {
      const { repository, service } = setup();
      repository.createGroup.mockResolvedValue('g-new');
      repository.findGroupById.mockResolvedValue(aGroup('g-new'));

      await expect(service.createGroup(input, 'u-petra')).resolves.toEqual(
        aGroup('g-new'),
      );
      expect(repository.createGroup).toHaveBeenCalledWith(input, 'u-petra');
    });

    it.each([
      ['activity', { activity: false, locality: true }],
      ['locality', { activity: true, locality: false }],
    ])('an unknown %s is a 400 and nothing is written', async (_, found) => {
      const { repository, service } = setup();
      repository.catalogHas.mockResolvedValue(found);

      await expect(
        service.createGroup(input, 'u-petra'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.createGroup).not.toHaveBeenCalled();
    });
  });

  describe('updateGroup', () => {
    it('an admin changes any field', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(true);
      const patch = { name: 'Deskovky Letná', type: 'public' as const };

      await service.updateGroup('g1', patch, 'u-petra');

      expect(repository.isActiveAdmin).toHaveBeenCalledWith('g1', 'u-petra');
      expect(repository.updateGroup).toHaveBeenCalledWith('g1', patch, {
        approvePending: true,
      });
    });

    it('anyone else gets 403 and nothing is written', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(false);

      await expect(
        service.updateGroup('g1', { name: 'Moje skupina' }, 'u-jakub'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateGroup).not.toHaveBeenCalled();
    });

    it('an unknown group is a 404 before the admin check', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(null);

      await expect(
        service.updateGroup('nope', { name: 'X' }, 'u-petra'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.isActiveAdmin).not.toHaveBeenCalled();
    });

    it('a changed activity is checked against the catalog', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(true);
      repository.catalogHas.mockResolvedValue({
        activity: false,
        locality: true,
      });

      await expect(
        service.updateGroup('g1', { activityId: 'a-nope' }, 'u-petra'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.catalogHas).toHaveBeenCalledWith({
        activityId: 'a-nope',
      });
      expect(repository.updateGroup).not.toHaveBeenCalled();
    });
  });

  it('a closed group made public lets its waiting requests in', async () => {
    const { repository, service } = setup();
    repository.findGroupById.mockResolvedValue(aGroup('g1'));
    repository.isActiveAdmin.mockResolvedValue(true);

    await service.updateGroup('g1', { name: 'Jiný název' }, 'u-petra');
    expect(repository.updateGroup).toHaveBeenLastCalledWith(
      'g1',
      { name: 'Jiný název' },
      { approvePending: false },
    );

    await service.updateGroup('g1', { type: 'public' }, 'u-petra');
    expect(repository.updateGroup).toHaveBeenLastCalledWith(
      'g1',
      { type: 'public' },
      { approvePending: true },
    );
  });

  describe('join', () => {
    it('joining a public group makes a member at once', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue({
        ...aGroup('g1'),
        type: 'public',
      });

      await expect(service.join('g1', 'u-jakub')).resolves.toEqual({
        status: 'active',
      });
      expect(repository.findGroupById).toHaveBeenCalledWith('g1', 'u-jakub');
      expect(repository.createMembership).toHaveBeenCalledWith(
        'g1',
        'u-jakub',
        'active',
        null,
      );
    });

    it('a closed group gets a request', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));

      await expect(service.join('g1', 'u-jakub')).resolves.toEqual({
        status: 'pending',
      });
      expect(repository.createMembership).toHaveBeenCalledWith(
        'g1',
        'u-jakub',
        'pending',
        null,
      );
    });

    it('a request passes its message on to be saved (#175)', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));

      await service.join('g1', 'u-jakub', 'Ahoj, hraju rád.');
      expect(repository.createMembership).toHaveBeenCalledWith(
        'g1',
        'u-jakub',
        'pending',
        'Ahoj, hraju rád.',
      );
    });

    it('asking twice writes nothing the second time', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue({
        ...aGroup('g1'),
        viewerMembership: { role: 'member', status: 'pending' },
      });

      await expect(service.join('g1', 'u-jakub')).resolves.toEqual({
        status: 'pending',
      });
      expect(repository.createMembership).not.toHaveBeenCalled();
    });

    it('a deactivated group is a 409 and a blocked user a 403', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValueOnce({
        ...aGroup('g1'),
        status: 'inactive',
      });
      await expect(service.join('g1', 'u-jakub')).rejects.toBeInstanceOf(
        ConflictException,
      );

      repository.findGroupById.mockResolvedValueOnce({
        ...aGroup('g1'),
        viewerMembership: { role: 'member', status: 'blocked' },
      });
      await expect(service.join('g1', 'u-jakub')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.createMembership).not.toHaveBeenCalled();
    });
  });

  describe('leave', () => {
    it('a member leaves', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue({
        ...aGroup('g1'),
        viewerMembership: { role: 'member', status: 'active' },
      });
      repository.countActiveAdmins.mockResolvedValue(1);

      await service.leave('g1', 'u-jakub');
      expect(repository.deleteMembership).toHaveBeenCalledWith('g1', 'u-jakub');
    });

    it('the last admin can not leave (409 LAST_ADMIN)', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue({
        ...aGroup('g1'),
        viewerMembership: { role: 'admin', status: 'active' },
      });
      repository.countActiveAdmins.mockResolvedValue(1);

      await expect(service.leave('g1', 'u-petra')).rejects.toMatchObject({
        response: { code: 'LAST_ADMIN' },
      });
      expect(repository.deleteMembership).not.toHaveBeenCalled();
    });
  });

  describe('requests', () => {
    it('only an admin sees the members and handles requests (403)', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(false);

      await expect(service.getMembers('g1', 'u-jakub')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.approveRequest('g1', 'u-jakub', 'u-petr'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.rejectRequest('g1', 'u-jakub', 'u-petr'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findMembers).not.toHaveBeenCalled();
      expect(repository.approveRequest).not.toHaveBeenCalled();
      expect(repository.deleteMembership).not.toHaveBeenCalled();
    });

    it('an admin approves a pending request', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(true);
      repository.findMembership.mockResolvedValue({
        role: 'member',
        status: 'pending',
      });

      await service.approveRequest('g1', 'u-petra', 'u-jakub');
      expect(repository.isActiveAdmin).toHaveBeenCalledWith('g1', 'u-petra');
      expect(repository.approveRequest).toHaveBeenCalledWith('g1', 'u-jakub');
    });

    it('rejecting removes the request', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(true);
      repository.findMembership.mockResolvedValue({
        role: 'member',
        status: 'pending',
      });

      await service.rejectRequest('g1', 'u-petra', 'u-jakub');
      expect(repository.deleteMembership).toHaveBeenCalledWith('g1', 'u-jakub');
    });

    it('a request handled already is a 409, nothing is written', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(true);
      repository.findMembership.mockResolvedValue({
        role: 'member',
        status: 'active',
      });

      await expect(
        service.rejectRequest('g1', 'u-petra', 'u-jakub'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.deleteMembership).not.toHaveBeenCalled();
    });
  });

  describe('deactivateGroup (B-051)', () => {
    it('an admin deactivates the group', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(true);

      await service.deactivateGroup('g1', 'u-petra');

      expect(repository.isActiveAdmin).toHaveBeenCalledWith('g1', 'u-petra');
      expect(repository.deactivateGroup).toHaveBeenCalledWith(
        'g1',
        expect.any(Date),
      );
    });

    it('anyone else gets 403 and nothing is written', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue(aGroup('g1'));
      repository.isActiveAdmin.mockResolvedValue(false);

      await expect(
        service.deactivateGroup('g1', 'u-jakub'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.deactivateGroup).not.toHaveBeenCalled();
    });

    it('a deactivated group is read-only: 409 GROUP_INACTIVE, nothing is written', async () => {
      const { repository, service } = setup();
      repository.findGroupById.mockResolvedValue({
        ...aGroup('g1'),
        status: 'inactive',
        viewerMembership: { role: 'admin', status: 'active' },
      });
      repository.isActiveAdmin.mockResolvedValue(true);
      repository.countActiveAdmins.mockResolvedValue(2);
      const inactive = { response: { code: 'GROUP_INACTIVE' } };

      await expect(
        service.deactivateGroup('g1', 'u-petra'),
      ).rejects.toMatchObject(inactive);
      await expect(
        service.updateGroup('g1', { name: 'Nový název' }, 'u-petra'),
      ).rejects.toMatchObject(inactive);
      await expect(service.getMembers('g1', 'u-petra')).rejects.toMatchObject(
        inactive,
      );
      await expect(
        service.approveRequest('g1', 'u-petra', 'u-jakub'),
      ).rejects.toMatchObject(inactive);
      await expect(service.leave('g1', 'u-petra')).rejects.toMatchObject(
        inactive,
      );
      // nobody joins or asks to join either
      await expect(service.join('g1', 'u-jakub')).rejects.toMatchObject(
        inactive,
      );

      expect(repository.deactivateGroup).not.toHaveBeenCalled();
      expect(repository.updateGroup).not.toHaveBeenCalled();
      expect(repository.findMembers).not.toHaveBeenCalled();
      expect(repository.approveRequest).not.toHaveBeenCalled();
      expect(repository.deleteMembership).not.toHaveBeenCalled();
      expect(repository.createMembership).not.toHaveBeenCalled();
    });
  });

  describe('announcements (#194)', () => {
    // 00:30 on 8 Nov in Prague, still 7 Nov in UTC: the day began at 23:00 UTC
    const now = new Date('2026-11-07T23:30:00.000Z');
    const pragueMidnight = new Date('2026-11-07T23:00:00.000Z');
    const announcement = {
      id: 'an1',
      subject: 'Přes svátky se nehraje',
      body: 'Pauza do 6. 1.',
      createdAt: now,
      sender: { id: 'u-petra', name: 'Petra' },
    };
    const input = { subject: announcement.subject, body: announcement.body };
    const admin = { role: 'admin', status: 'active' } as const;
    const member = { role: 'member', status: 'active' } as const;

    describe('getAnnouncements', () => {
      it('a member reads them, without a count to send', async () => {
        const { repository, service } = setup();
        repository.findGroupById.mockResolvedValue({
          ...aGroup('g1'),
          viewerMembership: member,
        });
        repository.findAnnouncements.mockResolvedValue([announcement]);

        await expect(
          service.getAnnouncements('g1', 'u-jakub', now),
        ).resolves.toEqual({
          announcements: [announcement],
          remainingToday: null,
        });
        expect(repository.findAnnouncements).toHaveBeenCalledWith('g1', 50);
        expect(repository.countAnnouncementsSince).not.toHaveBeenCalled();
      });

      it("an admin also learns what is left of today's limit, counted from Prague midnight", async () => {
        const { repository, service } = setup();
        repository.findGroupById.mockResolvedValue({
          ...aGroup('g1'),
          viewerMembership: admin,
        });
        repository.findAnnouncements.mockResolvedValue([]);
        repository.countAnnouncementsSince.mockResolvedValue(1);

        await expect(
          service.getAnnouncements('g1', 'u-petra', now),
        ).resolves.toMatchObject({ remainingToday: 2 });
        expect(repository.countAnnouncementsSince).toHaveBeenCalledWith(
          'g1',
          pragueMidnight,
        );
      });

      it('in a deactivated group they stay readable, but nothing is left to send', async () => {
        const { repository, service } = setup();
        repository.findGroupById.mockResolvedValue({
          ...aGroup('g1'),
          status: 'inactive',
          viewerMembership: admin,
        });
        repository.findAnnouncements.mockResolvedValue([announcement]);

        await expect(
          service.getAnnouncements('g1', 'u-petra', now),
        ).resolves.toEqual({
          announcements: [announcement],
          remainingToday: null,
        });
      });

      it.each([
        ['a non-member', null],
        ['an applicant', { role: 'member', status: 'pending' } as const],
        ['a blocked member', { role: 'member', status: 'blocked' } as const],
      ])('%s gets 403 NOT_GROUP_MEMBER', async (_who, viewerMembership) => {
        const { repository, service } = setup();
        repository.findGroupById.mockResolvedValue({
          ...aGroup('g1'),
          viewerMembership,
        });

        const error = await service
          .getAnnouncements('g1', 'u-cizi', now)
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getResponse()).toMatchObject({
          code: 'NOT_GROUP_MEMBER',
        });
        expect(repository.findAnnouncements).not.toHaveBeenCalled();
      });
    });

    describe('sendAnnouncement', () => {
      const asAdmin = (): ReturnType<typeof setup> => {
        const context = setup();
        context.repository.findGroupById.mockResolvedValue(aGroup('g1'));
        context.repository.isActiveAdmin.mockResolvedValue(true);
        return context;
      };

      it('an admin sends it; the limit counts from Prague midnight and the members get an e-mail', async () => {
        const { repository, notifications, service } = asAdmin();
        repository.createAnnouncement.mockResolvedValue({
          ok: true,
          announcement,
        });

        await expect(
          service.sendAnnouncement('g1', 'u-petra', input, now),
        ).resolves.toEqual(announcement);
        expect(repository.createAnnouncement).toHaveBeenCalledWith(
          'g1',
          'u-petra',
          input,
          pragueMidnight,
          expect.any(Function),
        );
        expect(notifications.notify).toHaveBeenCalledWith({
          type: 'group-announcement',
          announcementId: 'an1',
        });
      });

      it('a member who is not an admin gets 403 and nothing is written', async () => {
        const { repository, service } = asAdmin();
        repository.isActiveAdmin.mockResolvedValue(false);

        await expect(
          service.sendAnnouncement('g1', 'u-jakub', input, now),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.createAnnouncement).not.toHaveBeenCalled();
      });

      it('a deactivated group is 409 GROUP_INACTIVE', async () => {
        const { repository, service } = asAdmin();
        repository.findGroupById.mockResolvedValue({
          ...aGroup('g1'),
          status: 'inactive',
        });

        await expect(
          service.sendAnnouncement('g1', 'u-petra', input, now),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(repository.createAnnouncement).not.toHaveBeenCalled();
      });

      it('an unknown group is 404', async () => {
        const { repository, service } = asAdmin();
        repository.findGroupById.mockResolvedValue(null);

        await expect(
          service.sendAnnouncement('nope', 'u-petra', input, now),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('the fourth of the day is 429 ANNOUNCEMENT_LIMIT and no e-mail goes out', async () => {
        const { repository, notifications, service } = asAdmin();
        repository.createAnnouncement.mockImplementation(
          async (_g, _u, _i, _since, decide) => {
            const decision = decide({ groupStatus: 'active', sentToday: 3 });
            if (!decision.ok) return decision;
            return { ok: true, announcement };
          },
        );

        const error = await service
          .sendAnnouncement('g1', 'u-petra', input, now)
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(429);
        expect((error as HttpException).getResponse()).toMatchObject({
          code: 'ANNOUNCEMENT_LIMIT',
        });
        expect(notifications.notify).not.toHaveBeenCalled();
      });

      it('deactivated under the lock in the meantime is 409 GROUP_INACTIVE', async () => {
        const { repository, service } = asAdmin();
        repository.createAnnouncement.mockImplementation(
          async (_g, _u, _i, _since, decide) => {
            const decision = decide({ groupStatus: 'inactive', sentToday: 0 });
            if (!decision.ok) return decision;
            return { ok: true, announcement };
          },
        );

        await expect(
          service.sendAnnouncement('g1', 'u-petra', input, now),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });
  });
});
