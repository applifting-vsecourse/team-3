import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  anonymizedAccount,
  type AdminMembership,
} from '@/modules/account/domain/account-deletion';
import {
  exportAnnouncementSelect,
  exportFriendshipSelect,
  exportMembershipSelect,
  exportMessageSelect,
  exportNotificationSelect,
  exportOrganizedEventSelect,
  exportParticipationSelect,
  exportPaymentSelect,
  exportProfileSelect,
  exportRatingGivenSelect,
  exportRatingReceivedSelect,
  exportReportSelect,
  type AccountExportRows,
} from '@/modules/account/domain/account-export';
import { Injectable } from '@nestjs/common';

/** The places and requests a deleted account gives up: on events not started yet. */
const upcomingPlaces = (
  userId: string,
  now: Date,
): Prisma.ParticipationWhereInput => ({
  userId,
  status: { in: ['approved', 'pending'] },
  event: { startsAt: { gt: now } },
});

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The account as the deletion needs it; null for an unknown or deleted one. */
  async findAccount(userId: string): Promise<{
    email: string;
    hasPassword: boolean;
  } | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        email: true,
        accounts: {
          where: { providerId: 'credential', password: { not: null } },
          select: { id: true },
        },
      },
    });
    return user
      ? { email: user.email, hasPassword: user.accounts.length > 0 }
      : null;
  }

  /** The person's active admin memberships, with how many admins each group has. */
  async findAdminMemberships(userId: string): Promise<AdminMembership[]> {
    const rows = await this.prisma.groupMember.findMany({
      where: { userId, role: 'admin', status: 'active' },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            status: true,
            _count: {
              select: {
                members: { where: { role: 'admin', status: 'active' } },
              },
            },
          },
        },
      },
      orderBy: { group: { name: 'asc' } },
    });
    return rows.map(({ group }) => ({
      groupId: group.id,
      groupName: group.name,
      groupStatus: group.status,
      activeAdminCount: group._count.members,
    }));
  }

  /** How many events the person organizes that haven't started yet. */
  countUpcomingOrganized(userId: string, now: Date): Promise<number> {
    return this.prisma.event.count({
      where: {
        organizerUserId: userId,
        status: { in: ['published', 'hidden'] },
        startsAt: { gt: now },
      },
    });
  }

  /**
   * Everything for „Stáhnout moje data“, each list scoped to the person by
   * the session's id. Null for an unknown or deleted account.
   */
  async exportRows(userId: string): Promise<AccountExportRows | null> {
    const profile = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: exportProfileSelect,
    });
    if (!profile) return null;
    const [
      participations,
      organizedEvents,
      groupMemberships,
      ratingsGiven,
      ratingsReceivedAsOrganizer,
      friendships,
      notifications,
      eventMessages,
      groupAnnouncements,
      payments,
      reports,
    ] = await Promise.all([
      this.prisma.participation.findMany({
        where: { userId },
        select: exportParticipationSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.event.findMany({
        where: { organizerUserId: userId },
        select: exportOrganizedEventSelect,
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.groupMember.findMany({
        where: { userId },
        select: exportMembershipSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.rating.findMany({
        where: { userId },
        select: exportRatingGivenSelect,
        orderBy: { createdAt: 'asc' },
      }),
      // as the profile shows them: not removed by the superadmin
      this.prisma.rating.findMany({
        where: { deletedAt: null, event: { organizerUserId: userId } },
        select: exportRatingReceivedSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.friendship.findMany({
        where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: exportFriendshipSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: exportNotificationSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.eventMessage.findMany({
        where: { senderId: userId },
        select: exportMessageSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.groupAnnouncement.findMany({
        where: { senderId: userId },
        select: exportAnnouncementSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { userId },
        select: exportPaymentSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.report.findMany({
        where: { reporterId: userId },
        select: exportReportSelect,
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      profile,
      participations,
      organizedEvents,
      groupMemberships,
      ratingsGiven,
      ratingsReceivedAsOrganizer,
      friendships,
      notifications,
      eventMessages,
      groupAnnouncements,
      payments,
      reports,
    };
  }

  /**
   * Deletes the account in one transaction (B-080): gives up the places and
   * requests on events not started yet, leaves every group, ends the
   * friendships and requests, removes the interests, the upozornění, the
   * sessions and the sign-in accounts (so nobody can sign in, with a password
   * or Google), the person's pending verification links, and anonymizes the
   * row. Past participations, ratings, messages and payments stay, under
   * „Smazaný uživatel“. Returns the events where an approved place was given
   * up, for their organizers to hear of it; null when the account was deleted
   * meanwhile (a second click), and then nothing is written.
   */
  async deleteAccount(
    userId: string,
    email: string,
    now: Date,
  ): Promise<string[] | null> {
    return this.prisma.$transaction(async (tx) => {
      // first, under the row's lock: of two deletions at once one writes
      const { count } = await tx.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: anonymizedAccount(userId, now),
      });
      if (count === 0) return null;
      const freed = await tx.participation.findMany({
        where: { ...upcomingPlaces(userId, now), status: 'approved' },
        select: { eventId: true },
      });
      await tx.participation.updateMany({
        where: upcomingPlaces(userId, now),
        data: { status: 'withdrawn', updatedAt: now },
      });
      await tx.groupMember.deleteMany({ where: { userId } });
      await tx.friendship.deleteMany({
        where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      });
      await tx.userInterest.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      // BetterAuth's links: a password reset keeps the user's id, an e-mail
      // verification or change the address
      await tx.verification.deleteMany({
        where: {
          OR: [
            { value: userId },
            { identifier: { contains: email } },
            { value: { contains: email } },
          ],
        },
      });
      return freed.map(({ eventId }) => eventId);
    });
  }
}
