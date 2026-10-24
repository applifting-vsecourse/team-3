import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  GroupDetail,
  GroupFilters,
  GroupInput,
  GroupSummary,
  Membership,
  MembershipStatus,
  MyGroup,
} from '@/modules/group/domain/group';
import {
  GroupMemberEntry,
  GroupMembers,
} from '@/modules/group/domain/membership';
import { Injectable } from '@nestjs/common';
import { buildActiveGroupsWhere } from './active-groups-where';
import { buildMyGroupsWhere } from './my-groups-where';

const summaryInclude = {
  activity: { include: { category: true } },
  locality: true,
  // pending requests and blocked members are not members yet / any more
  _count: { select: { members: { where: { status: 'active' } } } },
} satisfies Prisma.GroupInclude;

type SummaryRow = Prisma.GroupGetPayload<{ include: typeof summaryInclude }>;

const detailInclude = {
  ...summaryInclude,
  members: {
    where: { role: 'admin', status: 'active' },
    select: { user: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.GroupInclude;

type DetailRow = Prisma.GroupGetPayload<{ include: typeof detailInclude }>;

const toSummary = (group: SummaryRow): GroupSummary => ({
  id: group.id,
  name: group.name,
  type: group.type,
  activity: {
    id: group.activity.id,
    slug: group.activity.slug,
    name: group.activity.name,
    category: {
      id: group.activity.category.id,
      slug: group.activity.category.slug,
      name: group.activity.category.name,
      icon: group.activity.category.icon,
    },
  },
  locality: {
    id: group.locality.id,
    slug: group.locality.slug,
    name: group.locality.name,
  },
  memberCount: group._count.members,
});

@Injectable()
export class GroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Active groups, by name, at most `limit`. */
  async findActiveGroups(query: {
    filters: GroupFilters;
    limit: number;
  }): Promise<GroupSummary[]> {
    const groups = await this.prisma.group.findMany({
      where: buildActiveGroupsWhere(query.filters),
      include: summaryInclude,
      // id breaks ties so the cut-off at `limit` is stable
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit,
    });
    return groups.map(toSummary);
  }

  /** „Moje skupiny“ (B-056), each with my own membership; the service sorts them. */
  async findMyGroups(userId: string): Promise<MyGroup[]> {
    const groups = await this.prisma.group.findMany({
      where: buildMyGroupsWhere(userId),
      include: {
        ...summaryInclude,
        members: { where: { userId }, select: { role: true, status: true } },
      },
    });
    return groups.flatMap((group) => {
      const [membership] = group.members;
      // the where clause guarantees an active or pending membership
      if (
        !membership ||
        (membership.status !== 'active' && membership.status !== 'pending')
      ) {
        return [];
      }
      return [
        {
          ...toSummary(group),
          membership: { role: membership.role, status: membership.status },
        },
      ];
    });
  }

  /**
   * Any group by id, deactivated ones too (a shared link keeps working),
   * with the viewer's own membership when they are signed in.
   */
  async findGroupById(
    id: string,
    viewerId: string | null = null,
  ): Promise<GroupDetail | null> {
    const [group, viewerMembership] = await Promise.all([
      this.findGroupRow(id),
      viewerId ? this.findMembership(id, viewerId) : null,
    ]);
    if (!group) return null;
    return {
      ...toSummary(group),
      description: group.description,
      status: group.status,
      admins: group.members.map((member) => member.user),
      viewerMembership,
    };
  }

  private findGroupRow(id: string): Promise<DetailRow | null> {
    return this.prisma.group.findUnique({
      where: { id },
      include: detailInclude,
    });
  }

  async findMembership(
    groupId: string,
    userId: string,
  ): Promise<Membership | null> {
    return this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true, status: true },
    });
  }

  async countActiveAdmins(groupId: string): Promise<number> {
    return this.prisma.groupMember.count({
      where: { groupId, role: 'admin', status: 'active' },
    });
  }

  async createMembership(
    groupId: string,
    userId: string,
    status: Extract<MembershipStatus, 'active' | 'pending'>,
  ): Promise<void> {
    await this.prisma.groupMember.create({
      data: { groupId, userId, role: 'member', status },
    });
  }

  async approveRequest(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { status: 'active' },
    });
  }

  /** Leaving, withdrawing a request and a rejected request all remove the row, so the user can ask again. */
  async deleteMembership(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  /** Deactivates the group and removes its waiting requests, in one write. */
  async deactivateGroup(id: string, at: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.group.update({
        where: { id },
        data: { status: 'inactive', deactivatedAt: at },
      }),
      this.prisma.groupMember.deleteMany({
        where: { groupId: id, status: 'pending' },
      }),
    ]);
  }

  /** Pending requests and active members for the group's management (D-07). */
  async findMembers(groupId: string): Promise<GroupMembers> {
    const rows = await this.prisma.groupMember.findMany({
      where: { groupId, status: { in: ['pending', 'active'] } },
      select: {
        role: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
      // admins first among members (D-07: „Správce skupiny“ on top)
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    const entry = (row: (typeof rows)[number]): GroupMemberEntry => ({
      userId: row.user.id,
      name: row.user.name,
      role: row.role,
      since: row.createdAt,
    });
    return {
      requests: rows
        .filter((row) => row.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(entry),
      members: rows.filter((row) => row.status === 'active').map(entry),
    };
  }

  async isActiveAdmin(groupId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.groupMember.count({
      where: { groupId, userId, role: 'admin', status: 'active' },
    });
    return count > 0;
  }

  /** Whether the catalog has these ids; checked before writing, so a bad id is a 400, not a foreign key error. */
  async catalogHas(ids: {
    activityId?: string;
    localityId?: string;
  }): Promise<{ activity: boolean; locality: boolean }> {
    const [activityCount, localityCount] = await Promise.all([
      ids.activityId
        ? this.prisma.activity.count({ where: { id: ids.activityId } })
        : 1,
      ids.localityId
        ? this.prisma.locality.count({ where: { id: ids.localityId } })
        : 1,
    ]);
    return { activity: activityCount > 0, locality: localityCount > 0 };
  }

  /** Creates the group with its founder as the first admin, in one write. */
  async createGroup(input: GroupInput, founderId: string): Promise<string> {
    const group = await this.prisma.group.create({
      data: {
        ...input,
        members: {
          create: { userId: founderId, role: 'admin', status: 'active' },
        },
      },
      select: { id: true },
    });
    return group.id;
  }

  /**
   * `approvePending`: the group became public, where only joining is approved,
   * so the waiting requests become members in the same write.
   */
  async updateGroup(
    id: string,
    patch: Partial<GroupInput>,
    { approvePending = false } = {},
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.group.update({ where: { id }, data: patch }),
      ...(approvePending
        ? [
            this.prisma.groupMember.updateMany({
              where: { groupId: id, status: 'pending' },
              data: { status: 'active' },
            }),
          ]
        : []),
    ]);
  }
}
