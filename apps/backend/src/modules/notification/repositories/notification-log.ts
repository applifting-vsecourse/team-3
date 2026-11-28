import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/core/prisma/prisma.service';

/**
 * The send log of the scheduled e-mails (B-043): rating invitations (#65) and
 * the reminders before an event (#405). One row per unique `key`; `sentAt`
 * stays null until the transport accepted the mail. Plain functions over
 * Prisma so each repository keeps its own constructor and specs.
 */
export const MAX_SCHEDULED_EMAIL_ATTEMPTS = 3;
const CLAIM_MS = 3600_000;

export type LogEntry = {
  key: string;
  type: string;
  eventId: string;
  userId: string;
};

/** Keys of this event that are sent, out of attempts or claimed right now. */
export async function findUnavailableLogKeys(
  prisma: PrismaService,
  eventId: string,
  now: Date,
): Promise<Set<string>> {
  const logs = await prisma.notificationLog.findMany({
    where: {
      eventId,
      OR: [
        { sentAt: { not: null } },
        { attempts: { gte: MAX_SCHEDULED_EMAIL_ATTEMPTS } },
        { lockedUntil: { gt: now } },
      ],
    },
    select: { key: true },
  });
  return new Set(logs.map(({ key }) => key));
}

/** A unique key plus an atomic conditional UPDATE arbitrates between workers.
 * Failed sends can retry; a crashed worker's claim expires after one hour. */
export async function claimLog(
  prisma: PrismaService,
  entry: LogEntry,
  now: Date,
): Promise<string | null> {
  await prisma.notificationLog.createMany({
    data: entry,
    skipDuplicates: true,
  });
  const claimToken = randomUUID();
  const { count } = await prisma.notificationLog.updateMany({
    where: {
      key: entry.key,
      sentAt: null,
      attempts: { lt: MAX_SCHEDULED_EMAIL_ATTEMPTS },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    },
    data: {
      claimToken,
      lockedUntil: new Date(now.getTime() + CLAIM_MS),
      attempts: { increment: 1 },
    },
  });
  return count === 1 ? claimToken : null;
}

export async function markLogSent(
  prisma: PrismaService,
  key: string,
  claimToken: string,
  now: Date,
): Promise<void> {
  const { count } = await prisma.notificationLog.updateMany({
    where: { key, claimToken, sentAt: null },
    data: { sentAt: now, claimToken: null, lockedUntil: null },
  });
  if (count !== 1) throw new Error('Scheduled e-mail claim lost');
}

export async function releaseLog(
  prisma: PrismaService,
  key: string,
  claimToken: string,
): Promise<void> {
  await prisma.notificationLog.updateMany({
    where: { key, claimToken, sentAt: null },
    data: { claimToken: null, lockedUntil: null },
  });
}
