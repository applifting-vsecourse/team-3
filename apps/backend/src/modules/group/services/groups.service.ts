import {
  GroupDetail,
  GroupFilters,
  GroupInput,
  GroupSummary,
} from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// No paging in sprint 2, like the event list; the endpoint is public, so it stays bounded.
export const GROUPS_LIMIT = 200;

@Injectable()
export class GroupsService {
  constructor(private readonly groupRepository: GroupRepository) {}

  /** Active public and closed groups matching the filters, by name. */
  async getActiveGroups(filters: GroupFilters): Promise<GroupSummary[]> {
    return this.groupRepository.findActiveGroups({
      filters,
      limit: GROUPS_LIMIT,
    });
  }

  async getGroup(id: string): Promise<GroupDetail> {
    const group = await this.groupRepository.findGroupById(id);
    if (!group) throw new NotFoundException('Skupina neexistuje');
    return group;
  }

  /** Any signed-in user founds a group and becomes its admin (US-16). */
  async createGroup(input: GroupInput, userId: string): Promise<GroupDetail> {
    await this.assertCatalogHas(input);
    const id = await this.groupRepository.createGroup(input, userId);
    return this.getGroup(id);
  }

  /** Only an admin of the group may change it; anyone else gets 403. */
  async updateGroup(
    id: string,
    patch: Partial<GroupInput>,
    userId: string,
  ): Promise<GroupDetail> {
    await this.getGroup(id);
    if (!(await this.groupRepository.isActiveAdmin(id, userId))) {
      throw new ForbiddenException('Skupinu může upravit jen její správce');
    }
    await this.assertCatalogHas(patch);
    await this.groupRepository.updateGroup(id, patch);
    return this.getGroup(id);
  }

  private async assertCatalogHas(ids: {
    activityId?: string;
    localityId?: string;
  }): Promise<void> {
    const found = await this.groupRepository.catalogHas(ids);
    if (!found.activity) throw new BadRequestException('Neznámá aktivita');
    if (!found.locality) throw new BadRequestException('Neznámá lokalita');
  }
}
