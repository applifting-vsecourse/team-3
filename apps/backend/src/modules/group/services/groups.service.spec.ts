import { GroupDetail, GroupInput } from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import {
  BadRequestException,
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
      expect(repository.updateGroup).toHaveBeenCalledWith('g1', patch);
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
});
