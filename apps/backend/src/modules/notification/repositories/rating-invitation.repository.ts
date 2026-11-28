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
  ratingInvitationEarliest,
  ratingInvitationKey,
} from '@/modules/notification/domain/rating-invitation';
import {
  claimLog,
  findUnavailableLogKeys,
  markLogSent,
  releaseLog,
} from '@/modules/notification/repositories/notification-log';
import { Injectable } from '@nestjs/common';

const recipientSelect = {
  id: true,
  email: true,
  blockedAt: true,
  deletedAt: true,
} as const;

/** Coarse SQL bounds, then the shared rating rules make the final decision.
 * Includes missed batches and late/no-end events while rating is still open. */
export function ratingInvitationEventsWhere(
  now: Date,
  activatedAt: Date,
): Prisma.EventWhereInput {
  const earliest = ratingInvitationEarliest(now, activatedAt);
  // The implicit end is the midnight after the start day. The service checks
  // the exact midnight before sending, including a deployment around midnight.
  const earliestStart = startOfPragueDay(pragueDayOf(earliest), -1);
  return {
    status: 'published',
    AND: [
      eventOverWhere(ratingBatchCutoff(now)),
      {
        OR: [
          { endsAt: { gte: earliest } },
          { endsAt: null, startsAt: { gte: earliestStart } },
        ],
      },
    ],
  };
}

@Injectable()
export class RatingInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActivationTime(): Promise<Date> {
    const { activatedAt } =
      await this.prisma.ratingInvitationSchedule.findUniqueOrThrow({
        where: { id: 1 },
        select: { activatedAt: true },
      });
    return activatedAt;
  }

  findEventIds(
    now: Date,
    after: string | undefined,
    activatedAt: Date,
  ): Promise<{ id: string }[]> {
    return this.prisma.event.findMany({
      where: {
        ...ratingInvitationEventsWhere(now, activatedAt),
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
          select: { userId: true },
        },
      },
    });
  }

  findUnavailableKeys(eventId: string, now: Date): Promise<Set<string>> {
    return findUnavailableLogKeys(this.prisma, eventId, now);
  }

  /** Shared send log (`notification-log.ts`): one worker per key, at most
   * three attempts, a crashed worker's claim expires after one hour. */
  claim(
    eventId: string,
    invitation: RatingInvitation,
    now: Date,
  ): Promise<string | null> {
    return claimLog(
      this.prisma,
      {
        key: ratingInvitationKey(eventId, invitation),
        type: `rating-invitation-${invitation.role}`,
        eventId,
        userId: invitation.userId,
      },
      now,
    );
  }

  markSent(key: string, claimToken: string, now: Date): Promise<void> {
    return markLogSent(this.prisma, key, claimToken, now);
  }

  release(key: string, claimToken: string): Promise<void> {
    return releaseLog(this.prisma, key, claimToken);
  }
}
