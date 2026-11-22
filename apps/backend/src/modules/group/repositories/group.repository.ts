import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  AnnouncementInput,
  AnnouncementRefusal,
  GroupAnnouncement,
} from '@/modules/group/domain/announcement';
import {
  GROUP_INACTIVE_CANCEL_REASON,
  GroupDetail,
  GroupFilters,
  GroupInput,
  GroupSummary,
  Membership,
  MembershipStatus,
  MyGroup,
  orderGroupsByName,
  RecruitingGroup,
} from '@/modules/group/domain/group';
import {
  GroupMemberEntry,
  GroupMembers,
} from '@/modules/group/domain/membership';
import { NewImage } from '@/modules/image/domain/uploaded-image';
import {
  createImage,
  deleteImage,
} from '@/modules/image/repositories/image.repository';
import { requestMessageFor } from '@/shared/request-message/request-message';
import { Injectable } from '@nestjs/common';
import { buildActiveGroupsWhere } from './active-groups-where';
import { buildMyGroupsWhere } from './my-groups-where';
import {
  buildRecruitingGroupsWhere,
  upcomingGroupEventWhere,
} from './recruiting-groups-where';

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

const announcementSelect = {
  id: true,
  subject: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, name: true } },
} satisfies Prisma.GroupAnnouncementSelect;

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
  imageKey: group.imageKey,
});

@Injectable()
export class GroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Active groups, by name, at most `limit`. */
  async findActiveGroups(query: {
    filters: GroupFilters;
    limit: number;
  }): Promise<GroupSummary[]> {
    // Czech order (#370): the database's collation puts Š after Z, so the names
    // are ordered here and only the first `limit` are loaded whole. The first
    // query reads every matching group's id and name: fine for hundreds of
    // groups. If it ever isn't, give `Group.name` the ICU collation
    // `cs-CZ-x-icu` in a migration and go back to one query with orderBy + take.
    const candidates = await this.prisma.group.findMany({
      where: buildActiveGroupsWhere(query.filters),
      select: { id: true, name: true },
    });
    const ids = orderGroupsByName(candidates)
      .slice(0, query.limit)
      .map(({ id }) => id);
    if (!ids.length) return [];
    const groups = await this.prisma.group.findMany({
      where: { id: { in: ids } },
      include: summaryInclude,
    });
    const byId = new Map(groups.map((group) => [group.id, group]));
    // a group deleted between the two queries drops out
    return ids.flatMap((id) => {
      const group = byId.get(id);
      return group ? [toSummary(group)] : [];
    });
  }

  /**
   * Groups that meet and look for members (#182), each with the start of its
   * next event; unordered, the landing page orders them. At most `limit`.
   */
  async findRecruitingGroups(query: {
    localityId?: string;
    viewerId: string | null;
    now: Date;
    limit: number;
  }): Promise<RecruitingGroup[]> {
    const groups = await this.prisma.group.findMany({
      where: buildRecruitingGroupsWhere(query, query.now),
      include: {
        ...summaryInclude,
        events: {
          where: upcomingGroupEventWhere(query.now),
          select: { startsAt: true },
          orderBy: { startsAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
      take: query.limit,
    });
    return groups.flatMap((group) => {
      const [next] = group.events;
      // the where guarantees one; a race with a cancellation drops the group
      return next ? [{ ...toSummary(group), nextEventAt: next.startsAt }] : [];
    });
  }

  /**
   * „Moje skupiny“ (B-056), each with my own membership and, in a group I run, the
   * requests waiting (#304), counted by the database for those groups only; the
   * service sorts them.
   */
  async findMyGroups(userId: string): Promise<MyGroup[]> {
    const groups = await this.prisma.group.findMany({
      where: buildMyGroupsWhere(userId),
      include: {
        ...summaryInclude,
        members: { where: { userId }, select: { role: true, status: true } },
      },
    });
    const running = groups
      .filter(
        ({ members: [mine] }) =>
          mine?.role === 'admin' && mine.status === 'active',
      )
      .map((group) => group.id);
    // no message: that stays in the management (#175)
    const waiting =
      running.length === 0
        ? []
        : await this.prisma.groupMember.groupBy({
            by: ['groupId'],
            where: { groupId: { in: running }, status: 'pending' },
            _count: { _all: true },
          });
    const waitingByGroup = new Map(
      waiting.map((row) => [row.groupId, row._count._all]),
    );
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
          pendingRequests: running.includes(group.id)
            ? (waitingByGroup.get(group.id) ?? 0)
            : null,
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

  /**
   * Writes the membership unless the user already has one: false when a
   * second „Přidat se“ at the same moment got there first (S-3, #226). The
   * unique key decides it in the database, so the loser gets no 500.
   */
  async createMembership(
    groupId: string,
    userId: string,
    status: Extract<MembershipStatus, 'active' | 'pending'>,
    message: string | null = null,
  ): Promise<boolean> {
    const { count } = await this.prisma.groupMember.createMany({
      data: {
        groupId,
        userId,
        role: 'member',
        status,
        // only a request carries a message for the admins (#175)
        message: requestMessageFor(status, message),
      },
      skipDuplicates: true,
    });
    return count > 0;
  }

  /**
   * Approves the request only while it still waits, checked in the write
   * itself (S-3, #226): false when another admin decided it meanwhile.
   */
  async approveRequest(groupId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.groupMember.updateMany({
      where: { groupId, userId, status: 'pending' },
      data: { status: 'active' },
    });
    return count > 0;
  }

  /**
   * Removes the request only while it still waits (S-3, #226), so the user
   * can ask again; false when another admin decided it meanwhile, and a
   * member approved a moment ago stays.
   */
  async rejectRequest(groupId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.groupMember.deleteMany({
      where: { groupId, userId, status: 'pending' },
    });
    return count > 0;
  }

  /** Leaving and withdrawing a request remove the row, so the user can ask again. */
  async deleteMembership(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  /**
   * Deactivates the group, removes its waiting requests and cancels its
   * upcoming events with a reason (B-051, B-055), in one write. Past events
   * stay as they are, in the group's history.
   */
  async deactivateGroup(id: string, at: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.group.update({
        where: { id },
        data: { status: 'inactive', deactivatedAt: at },
      }),
      this.prisma.groupMember.deleteMany({
        where: { groupId: id, status: 'pending' },
      }),
      this.prisma.event.updateMany({
        where: { groupId: id, status: 'published', startsAt: { gt: at } },
        data: {
          status: 'cancelled',
          cancelReason: GROUP_INACTIVE_CANCEL_REASON,
          cancelledAt: at,
        },
      }),
    ]);
  }

  /**
   * Sets the group's own photo (#77), or with `null` removes it; the previous
   * one is deleted. Under the group's lock: a group deactivated meanwhile
   * keeps its photo (`inactive`). Null when there is no such group.
   */
  async replaceImage(
    id: string,
    image: NewImage | null,
  ): Promise<'ok' | 'inactive' | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "group" WHERE "id" = ${id} FOR UPDATE`;
      const group = await tx.group.findUnique({
        where: { id },
        select: { status: true, imageKey: true },
      });
      if (!group) return null;
      if (group.status !== 'active') return 'inactive';
      const imageKey = image ? await createImage(tx, image) : null;
      await tx.group.update({ where: { id }, data: { imageKey } });
      if (group.imageKey) await deleteImage(tx, group.imageKey);
      return 'ok';
    });
  }

  /** Pending requests and active members for the group's management (D-07). */
  async findMembers(groupId: string): Promise<GroupMembers> {
    const rows = await this.prisma.groupMember.findMany({
      where: { groupId, status: { in: ['pending', 'active'] } },
      select: {
        role: true,
        status: true,
        createdAt: true,
        message: true,
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
      // the message belongs to the request; a member's old one stays unsaid
      message: row.status === 'pending' ? row.message : null,
    });
    return {
      requests: rows
        .filter((row) => row.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(entry),
      members: rows.filter((row) => row.status === 'active').map(entry),
    };
  }

  /** The group's announcements, newest first, at most `limit` (#194). */
  async findAnnouncements(
    groupId: string,
    limit: number,
  ): Promise<GroupAnnouncement[]> {
    return this.prisma.groupAnnouncement.findMany({
      where: { groupId },
      select: announcementSelect,
      // id breaks ties of two in the same millisecond
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }

  /** How many announcements the group has sent in all (the count in the section's heading). */
  async countAnnouncements(groupId: string): Promise<number> {
    return this.prisma.groupAnnouncement.count({ where: { groupId } });
  }

  /** How many announcements the group has sent since `since` (the daily limit). */
  async countAnnouncementsSince(groupId: string, since: Date): Promise<number> {
    return this.prisma.groupAnnouncement.count({
      where: { groupId, createdAt: { gte: since } },
    });
  }

  /**
   * Writes the announcement under a row lock on the group, like a group's
   * event (review #264): a deactivation or another announcement at the same
   * moment waits, so `decide` sees the state that holds when it is written
   * and the daily limit can't be overrun by two clicks at once.
   */
  async createAnnouncement(
    groupId: string,
    senderId: string,
    input: AnnouncementInput,
    since: Date,
    decide: (state: {
      groupStatus: 'active' | 'inactive';
      sentToday: number;
    }) => { ok: true } | { ok: false; refusal: AnnouncementRefusal },
  ): Promise<
    | { ok: true; announcement: GroupAnnouncement }
    | { ok: false; refusal: AnnouncementRefusal }
  > {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "group" WHERE "id" = ${groupId} FOR UPDATE`;
      const [group, sentToday] = await Promise.all([
        tx.group.findUniqueOrThrow({
          where: { id: groupId },
          select: { status: true },
        }),
        tx.groupAnnouncement.count({
          where: { groupId, createdAt: { gte: since } },
        }),
      ]);
      const decision = decide({ groupStatus: group.status, sentToday });
      if (!decision.ok) return decision;
      const announcement = await tx.groupAnnouncement.create({
        data: { groupId, senderId, ...input },
        select: announcementSelect,
      });
      return { ok: true, announcement };
    });
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
