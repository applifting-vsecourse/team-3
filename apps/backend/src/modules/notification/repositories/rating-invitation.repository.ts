import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { eventOverWhere } from '@/modules/event/domain/event-over';
import {
  pragueDayOf,
  startOfPragueDay,
} from '@/modules/event/domain/prague-day';
import {
  InvitationEvent,
  ratingBatchCutoff,
  RatingInvitation,
  ratingInvitationKey,
} from '@/modules/notification/domain/rating-invitation';
import { RATING_WINDOW_DAYS } from '@/modules/rating/domain/rating-window';
import { Injectable } from '@nestjs/common';

const recipientSelect = {
  id: true,
  email: true,
  blockedAt: true,
  deletedAt: true,
} as const;

/** Coarse SQL bounds, then the shared rating rules make the final decision.
 * Includes missed batches and late/no-end events while rating is still open. */
export function ratingInvitationEventsWhere(now: Date): Prisma.EventWhereInput {
  const earliest = startOfPragueDay(pragueDayOf(now), -RATING_WINDOW_DAYS);
  return {
    status: 'published',
    AND: [
      eventOverWhere(ratingBatchCutoff(now)),
      {
        OR: [
          { endsAt: { gte: earliest } },
          { endsAt: null, startsAt: { gte: earliest } },
        ],
      },
    ],
  };
}

@Injectable()
export class RatingInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEventIds(now: Date, after?: string): Promise<{ id: string }[]> {
    return this.prisma.event.findMany({
      where: {
        ...ratingInvitationEventsWhere(now),
        ...(after && { id: { gt: after } }),
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 100,
    });
  }

  findEvent(eventId: string): Promise<InvitationEvent | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        status: true,
        minParticipants: true,
        organizerUserId: true,
        organizer: { select: recipientSelect },
        participations: {
          where: { status: 'approved' },
          orderBy: { id: 'asc' },
          select: {
            user: { select: recipientSelect },
            rating: { select: { deletedAt: true } },
          },
        },
        ratings: {
          where: { deletedAt: { not: null } },
          select: { userId: true },
        },
      },
    });
  }

  /** A unique key plus an atomic conditional UPDATE arbitrates between workers.
   * Failed sends can retry; a crashed worker's claim expires after one hour. */
  async claim(
    eventId: string,
    invitation: RatingInvitation,
    now: Date,
  ): Promise<string | null> {
    const key = ratingInvitationKey(eventId, invitation);
    await this.prisma.notificationLog.createMany({
      data: {
        key,
        type: `rating-invitation-${invitation.role}`,
        eventId,
        userId: invitation.userId,
      },
      skipDuplicates: true,
    });
    const claimToken = randomUUID();
    const { count } = await this.prisma.notificationLog.updateMany({
      where: {
        key,
        sentAt: null,
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      },
      data: { claimToken, lockedUntil: new Date(now.getTime() + 3600_000) },
    });
    return count === 1 ? claimToken : null;
  }

  async markSent(key: string, claimToken: string, now: Date): Promise<void> {
    const { count } = await this.prisma.notificationLog.updateMany({
      where: { key, claimToken, sentAt: null },
      data: { sentAt: now, claimToken: null, lockedUntil: null },
    });
    if (count !== 1) throw new Error('Rating invitation claim lost');
  }

  async release(key: string, claimToken: string): Promise<void> {
    await this.prisma.notificationLog.updateMany({
      where: { key, claimToken, sentAt: null },
      data: { claimToken: null, lockedUntil: null },
    });
  }
}
