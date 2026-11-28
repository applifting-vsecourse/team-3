import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  EventReminder,
  eventReminderKey,
  PARTICIPANT_REMINDER_HOURS,
  REMINDER_GRACE_HOURS,
  ReminderEvent,
} from '@/modules/notification/domain/event-reminder';
import {
  claimLog,
  findUnavailableLogKeys,
  markLogSent,
  releaseLog,
} from '@/modules/notification/repositories/notification-log';
import { Injectable } from '@nestjs/common';

const HOUR = 3600_000;

const recipientSelect = {
  id: true,
  email: true,
  emailVerified: true,
  blockedAt: true,
  deletedAt: true,
} as const;

/** Starts whose e-mail sent `hours` before is due now (see `isDue`). */
const dueStarts = (now: Date, hours: number): Prisma.EventWhereInput => ({
  startsAt: {
    gt: new Date(now.getTime() + (hours - REMINDER_GRACE_HOURS) * HOUR),
    lte: new Date(now.getTime() + hours * HOUR),
  },
});

/**
 * Published events with a reminder or an overview due now: starting 20–24 or
 * 44–48 hours from now. The domain makes the final decision (the minimum,
 * the recipients); the participant reminder shares the 24-hour window.
 */
export function eventRemindersWhere(now: Date): Prisma.EventWhereInput {
  return {
    status: 'published',
    OR: [dueStarts(now, PARTICIPANT_REMINDER_HOURS), dueStarts(now, 48)],
  };
}

@Injectable()
export class EventReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEventIds(
    now: Date,
    after: string | undefined,
  ): Promise<{ id: string }[]> {
    return this.prisma.event.findMany({
      where: {
        ...eventRemindersWhere(now),
        ...(after && { id: { gt: after } }),
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 100,
    });
  }

  findEvent(eventId: string): Promise<ReminderEvent | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        address: true,
        status: true,
        minParticipants: true,
        organizerUserId: true,
        organizer: { select: recipientSelect },
        participations: {
          where: { status: 'approved' },
          orderBy: { id: 'asc' },
          select: { user: { select: recipientSelect } },
        },
      },
    });
  }

  findUnavailableKeys(eventId: string, now: Date): Promise<Set<string>> {
    return findUnavailableLogKeys(this.prisma, eventId, now);
  }

  claim(
    event: Pick<ReminderEvent, 'id' | 'startsAt'>,
    reminder: EventReminder,
    now: Date,
  ): Promise<string | null> {
    return claimLog(
      this.prisma,
      {
        key: eventReminderKey(event, reminder),
        type: `event-reminder-${reminder.kind}`,
        eventId: event.id,
        userId: reminder.userId,
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
