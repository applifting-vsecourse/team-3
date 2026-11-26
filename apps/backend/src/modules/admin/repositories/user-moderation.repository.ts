import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BlockState,
  UserModerationDecision,
} from '@/modules/admin/domain/user-moderation';
import { Injectable } from '@nestjs/common';

type Decide = (state: BlockState) => UserModerationDecision;

/** What the superadmin's „Správa“ lists (PO 26. 11.). */
export type AdminOverview = {
  hiddenEvents: {
    id: string;
    title: string;
    startsAt: Date;
    reason: string | null;
    hiddenAt: Date | null;
  }[];
  blockedUsers: {
    id: string;
    name: string;
    blockedAt: Date;
    reason: string | null;
  }[];
};

const OVERVIEW_TAKE = 100;

/**
 * Blocking and unblocking users (PO 26. 11., B-063), each in one transaction under a row
 * lock on the user, with the history (`block_user`), and the superadmin's overview. Null when
 * there is no such user (or the account is deleted).
 */
@Injectable()
export class UserModerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Blocks the user, ends their sessions and writes `block_user` with the reason. */
  async blockUser(
    userId: string,
    adminId: string,
    reason: string,
    now: Date,
    decide: Decide,
  ): Promise<UserModerationDecision | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "user" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true, blockedAt: true, deletedAt: true },
      });
      if (!user || user.deletedAt) return null;
      const decision = decide({
        role: user.role,
        blockedAt: user.blockedAt,
        isSelf: userId === adminId,
      });
      if (!decision.ok) return decision;
      await tx.user.update({ where: { id: userId }, data: { blockedAt: now } });
      // signed out everywhere at once, not only refused on the next write
      await tx.session.deleteMany({ where: { userId } });
      await tx.moderationAction.create({
        data: {
          type: 'block_user',
          targetType: 'user',
          targetId: userId,
          reason,
          adminId,
        },
      });
      return decision;
    });
  }

  /** Unblocks the user and marks the block as reverted, by whom and when. */
  async unblockUser(
    userId: string,
    adminId: string,
    now: Date,
    decide: Decide,
  ): Promise<UserModerationDecision | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "user" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true, blockedAt: true, deletedAt: true },
      });
      if (!user || user.deletedAt) return null;
      const decision = decide({
        role: user.role,
        blockedAt: user.blockedAt,
        isSelf: userId === adminId,
      });
      if (!decision.ok) return decision;
      await tx.user.update({
        where: { id: userId },
        data: { blockedAt: null },
      });
      await tx.moderationAction.updateMany({
        where: {
          type: 'block_user',
          targetType: 'user',
          targetId: userId,
          revertedAt: null,
        },
        data: { revertedAt: now, revertedById: adminId },
      });
      return decision;
    });
  }

  /** The deactivated events and the blocked users, newest first, with the reasons. */
  async overview(): Promise<AdminOverview> {
    const [events, users] = await Promise.all([
      this.prisma.event.findMany({
        where: { status: 'hidden' },
        select: { id: true, title: true, startsAt: true },
        orderBy: { updatedAt: 'desc' },
        take: OVERVIEW_TAKE,
      }),
      this.prisma.user.findMany({
        where: { blockedAt: { not: null }, deletedAt: null },
        select: { id: true, name: true, blockedAt: true },
        orderBy: { blockedAt: 'desc' },
        take: OVERVIEW_TAKE,
      }),
    ]);
    const actions = await this.prisma.moderationAction.findMany({
      where: {
        revertedAt: null,
        OR: [
          {
            type: 'hide_event',
            targetType: 'event',
            targetId: { in: events.map((event) => event.id) },
          },
          {
            type: 'block_user',
            targetType: 'user',
            targetId: { in: users.map((user) => user.id) },
          },
        ],
      },
      select: { targetId: true, reason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    // the latest action per target
    const latest = new Map<string, { reason: string; createdAt: Date }>();
    for (const action of actions) {
      if (!latest.has(action.targetId)) latest.set(action.targetId, action);
    }
    return {
      hiddenEvents: events.map((event) => ({
        ...event,
        reason: latest.get(event.id)?.reason ?? null,
        hiddenAt: latest.get(event.id)?.createdAt ?? null,
      })),
      blockedUsers: users.map((user) => ({
        id: user.id,
        name: user.name,
        blockedAt: user.blockedAt!,
        reason: latest.get(user.id)?.reason ?? null,
      })),
    };
  }
}
