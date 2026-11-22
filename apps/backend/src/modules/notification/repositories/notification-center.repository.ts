import { PrismaService } from '@/core/prisma/prisma.service';
import { InAppType } from '@/modules/notification/domain/in-app';
import { Injectable } from '@nestjs/common';

/** One upozornění as its recipient reads it. */
export type StoredNotification = {
  id: string;
  type: InAppType;
  targetId: string;
  text: string;
  createdAt: Date;
  readAt: Date | null;
};

/**
 * The centre (#86): every query is scoped to its recipient, so nobody can
 * read or mark somebody else's upozornění, not even by guessing an id.
 */
@Injectable()
export class NotificationCenterRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The newest first (the id breaks a tie within one write). */
  list(userId: string, limit: number): Promise<StoredNotification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        targetId: true,
        text: true,
        createdAt: true,
        readAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  /**
   * Marks one as read; one already read keeps its time. False when the user
   * has no such upozornění, whether it doesn't exist or isn't theirs.
   */
  async markRead(userId: string, id: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: now },
    });
    if (count > 0) return true;
    return (
      (await this.prisma.notification.count({ where: { id, userId } })) > 0
    );
  }

  /** „Označit vše jako přečtené“: how many were unread. */
  async markAllRead(userId: string, now: Date): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: now },
    });
    return count;
  }
}
