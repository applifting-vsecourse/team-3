import { GroupDetail, GroupInput } from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  service: GroupsService;
} => {
  const repository = mock<GroupRepository>();
  repository.catalogHas.mockResolvedValue({ activity: true, locality: true });
  return { repository, service: new GroupsService(repository) };
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
});
