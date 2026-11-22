import {
  InAppType,
  notificationPath,
} from '@/modules/notification/domain/in-app';
import { NotificationCenterRepository } from '@/modules/notification/repositories/notification-center.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

/** How many the centre shows (docs/navrh-upozorneni.md › Chování centra). */
export const NOTIFICATION_LIST_LIMIT = 50;

export type CentreItem = {
  id: string;
  type: InAppType;
  text: string;
  /** Where a click leads in the frontend (`notificationPath`). */
  path: string;
  createdAt: Date;
  readAt: Date | null;
};

export type Centre = { items: CentreItem[]; unreadCount: number };

/** The centre of upozornění (#86, B-044): always the signed-in user's own. */
@Injectable()
export class NotificationCenterService {
  constructor(private readonly repository: NotificationCenterRepository) {}

  /** The newest 50 and how many of all of them are unread (more may be unread than listed). */
  async list(userId: string): Promise<Centre> {
    const [rows, unreadCount] = await Promise.all([
      this.repository.list(userId, NOTIFICATION_LIST_LIMIT),
      this.repository.countUnread(userId),
    ]);
    return {
      items: rows.map(({ targetId, ...row }) => ({
        ...row,
        path: notificationPath(row.type, targetId),
      })),
      unreadCount,
    };
  }

  /** For the bell's number, asked for often: a count, no list. */
  unreadCount(userId: string): Promise<number> {
    return this.repository.countUnread(userId);
  }

  /** 404 when the user has no such upozornění: somebody else's is never confirmed to exist. */
  async markRead(
    userId: string,
    id: string,
    now: Date = new Date(),
  ): Promise<void> {
    if (!(await this.repository.markRead(userId, id, now))) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Upozornění neexistuje.',
      });
    }
  }

  markAllRead(userId: string, now: Date = new Date()): Promise<number> {
    return this.repository.markAllRead(userId, now);
  }
}
