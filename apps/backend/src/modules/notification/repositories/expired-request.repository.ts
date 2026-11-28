import { PrismaService } from '@/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

/**
 * How far back a started event still gets its waiting requests told (#465).
 * A tick runs every 15 minutes; a day covers a restart or an outage without
 * telling people about an event long over (or, on the first run, every old
 * request at once).
 */
export const EXPIRED_REQUEST_LOOKBACK_MS = 24 * 3600_000;

export type ExpiredRequests = { eventId: string; userIds: string[] };

@Injectable()
export class ExpiredRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Requests still waiting on a published event that started in the last
   * day, by event — without those whose applicant was already told
   * (a `request_expired` upozornění for that event), so each hears it once.
   */
  async findDue(now: Date): Promise<ExpiredRequests[]> {
    const pending = await this.prisma.participation.findMany({
      where: {
        status: 'pending',
        event: {
          status: 'published',
          startsAt: {
            lte: now,
            gt: new Date(now.getTime() - EXPIRED_REQUEST_LOOKBACK_MS),
          },
        },
      },
      select: { eventId: true, userId: true },
      orderBy: [{ eventId: 'asc' }, { userId: 'asc' }],
    });
    if (pending.length === 0) return [];
    const told = await this.prisma.notification.findMany({
      where: {
        type: 'request_expired',
        targetType: 'event',
        targetId: { in: [...new Set(pending.map(({ eventId }) => eventId))] },
      },
      select: { userId: true, targetId: true },
    });
    const isTold = new Set(
      told.map(({ userId, targetId }) => `${targetId}:${userId}`),
    );
    const byEvent = new Map<string, string[]>();
    for (const { eventId, userId } of pending) {
      if (isTold.has(`${eventId}:${userId}`)) continue;
      byEvent.set(eventId, [...(byEvent.get(eventId) ?? []), userId]);
    }
    return [...byEvent].map(([eventId, userIds]) => ({ eventId, userIds }));
  }
}
