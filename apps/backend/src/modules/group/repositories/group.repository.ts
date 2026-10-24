import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  GroupDetail,
  GroupFilters,
  GroupInput,
  GroupSummary,
} from '@/modules/group/domain/group';
import { Injectable } from '@nestjs/common';
import { buildActiveGroupsWhere } from './active-groups-where';

const summaryInclude = {
  activity: { include: { category: true } },
  locality: true,
  // pending requests and blocked members are not members yet / any more
  _count: { select: { members: { where: { status: 'active' } } } },
} satisfies Prisma.GroupInclude;

type SummaryRow = Prisma.GroupGetPayload<{ include: typeof summaryInclude }>;

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

  /** Any group by id, deactivated ones too (a shared link keeps working). */
  async findGroupById(id: string): Promise<GroupDetail | null> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        ...summaryInclude,
        members: {
          where: { role: 'admin', status: 'active' },
          select: { user: { select: { id: true, name: true } } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!group) return null;
    return {
      ...toSummary(group),
      description: group.description,
      status: group.status,
      admins: group.members.map((member) => member.user),
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

  async updateGroup(id: string, patch: Partial<GroupInput>): Promise<void> {
    await this.prisma.group.update({ where: { id }, data: patch });
  }
}
