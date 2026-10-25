import {
  GroupDetail,
  GroupFilters,
  GroupInput,
  GroupSummary,
  MyGroup,
  sortMyGroups,
} from '@/modules/group/domain/group';
import {
  decideJoin,
  decideLeave,
  decideRequest,
  GroupMembers,
  MembershipError,
} from '@/modules/group/domain/membership';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const MEMBERSHIP_ERRORS: Record<MembershipError, () => HttpException> = {
  GROUP_INACTIVE: () =>
    new ConflictException({
      code: 'GROUP_INACTIVE',
      message: 'Skupina už není aktivní',
    }),
  MEMBER_BLOCKED: () =>
    new ForbiddenException({
      code: 'MEMBER_BLOCKED',
      message: 'Do skupiny se nemůžeš znovu přidat',
    }),
  NOT_MEMBER: () =>
    new NotFoundException({
      code: 'NOT_MEMBER',
      message: 'Ve skupině nejsi',
    }),
  LAST_ADMIN: () =>
    new ConflictException({
      code: 'LAST_ADMIN',
      message: 'Poslední správce nemůže ze skupiny odejít',
    }),
  NOT_PENDING: () =>
    new ConflictException({
      code: 'NOT_PENDING',
      message: 'Žádost už je vyřízená',
    }),
};

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

  /** `viewerId`: the signed-in viewer, whose own membership the page shows. */
  /** „Moje skupiny“ (B-056): my waiting requests on top, then my groups, by name. */
  async getMyGroups(userId: string): Promise<MyGroup[]> {
    return sortMyGroups(await this.groupRepository.findMyGroups(userId));
  }

  async getGroup(
    id: string,
    viewerId: string | null = null,
  ): Promise<GroupDetail> {
    const group = await this.groupRepository.findGroupById(id, viewerId);
    if (!group) throw new NotFoundException('Skupina neexistuje');
    return group;
  }

  /** Any signed-in user founds a group and becomes its admin (US-16). */
  async createGroup(input: GroupInput, userId: string): Promise<GroupDetail> {
    await this.assertCatalogHas(input);
    const id = await this.groupRepository.createGroup(input, userId);
    return this.getGroup(id, userId);
  }

  /** Only an admin of the group may change it; anyone else gets 403. */
  async updateGroup(
    id: string,
    patch: Partial<GroupInput>,
    userId: string,
  ): Promise<GroupDetail> {
    const group = await this.getActiveGroup(id);
    await this.assertAdmin(id, userId, 'Skupinu může upravit jen její správce');
    await this.assertCatalogHas(patch);
    await this.groupRepository.updateGroup(id, patch, {
      // in a public group only joining is approved, so nobody is left waiting
      approvePending: group.type === 'closed' && patch.type === 'public',
    });
    return this.getGroup(id, userId);
  }

  /** „Přidat se“ / „Požádat o členství“ (US-17): the resulting status. */
  async join(
    groupId: string,
    userId: string,
  ): Promise<{ status: 'active' | 'pending' | 'blocked' }> {
    const group = await this.getGroup(groupId, userId);
    const decision = decideJoin(group, group.viewerMembership);
    if (decision.kind === 'error') throw MEMBERSHIP_ERRORS[decision.error]();
    if (decision.kind === 'create') {
      await this.groupRepository.createMembership(
        groupId,
        userId,
        decision.status,
      );
    }
    return { status: decision.status };
  }

  /** „Odejít ze skupiny“, also withdrawing a pending request. */
  async leave(groupId: string, userId: string): Promise<void> {
    const group = await this.getActiveGroup(groupId, userId);
    const decision = decideLeave(
      group.viewerMembership,
      await this.groupRepository.countActiveAdmins(groupId),
    );
    if (decision.kind === 'error') throw MEMBERSHIP_ERRORS[decision.error]();
    await this.groupRepository.deleteMembership(groupId, userId);
  }

  /** Requests and members for the management (D-07); only an admin. */
  async getMembers(groupId: string, userId: string): Promise<GroupMembers> {
    await this.getActiveGroup(groupId);
    await this.assertAdmin(
      groupId,
      userId,
      'Členy a žádosti vidí jen správce skupiny',
    );
    return this.groupRepository.findMembers(groupId);
  }

  /** Any admin approves a pending request (US-17). */
  async approveRequest(
    groupId: string,
    adminId: string,
    userId: string,
  ): Promise<void> {
    await this.assertPendingRequest(groupId, adminId, userId);
    await this.groupRepository.approveRequest(groupId, userId);
  }

  /** Any admin rejects a pending request; it is removed, so the user can ask again. */
  async rejectRequest(
    groupId: string,
    adminId: string,
    userId: string,
  ): Promise<void> {
    await this.assertPendingRequest(groupId, adminId, userId);
    await this.groupRepository.deleteMembership(groupId, userId);
  }

  /**
   * „Deaktivovat skupinu“ (B-051): the group is kept, not deleted — it drops
   * out of the list, nobody joins and its waiting requests are removed,
   * since nobody will decide them. Members stay as history; it is final.
   */
  async deactivateGroup(groupId: string, userId: string): Promise<void> {
    await this.getActiveGroup(groupId);
    await this.assertAdmin(
      groupId,
      userId,
      'Skupinu může deaktivovat jen její správce',
    );
    await this.groupRepository.deactivateGroup(groupId, new Date());
  }

  /**
   * A deactivated group is read-only (#54): no editing, management,
   * leaving or deciding requests — 409 GROUP_INACTIVE.
   */
  private async getActiveGroup(
    id: string,
    viewerId: string | null = null,
  ): Promise<GroupDetail> {
    const group = await this.getGroup(id, viewerId);
    if (group.status !== 'active') throw MEMBERSHIP_ERRORS.GROUP_INACTIVE();
    return group;
  }

  private async assertPendingRequest(
    groupId: string,
    adminId: string,
    userId: string,
  ): Promise<void> {
    await this.getActiveGroup(groupId);
    await this.assertAdmin(
      groupId,
      adminId,
      'Žádosti vyřizuje jen správce skupiny',
    );
    const decision = decideRequest(
      await this.groupRepository.findMembership(groupId, userId),
    );
    if (decision.kind === 'error') throw MEMBERSHIP_ERRORS[decision.error]();
  }

  private async assertAdmin(
    groupId: string,
    userId: string,
    message: string,
  ): Promise<void> {
    if (!(await this.groupRepository.isActiveAdmin(groupId, userId))) {
      throw new ForbiddenException(message);
    }
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
