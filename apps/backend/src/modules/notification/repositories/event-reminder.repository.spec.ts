import { PrismaService } from '@/core/prisma/prisma.service';
import { reminderEvent } from '@/modules/notification/testing/event-reminder.fixture';
import { mockDeep } from 'jest-mock-extended';
import {
  EventReminderRepository,
  eventRemindersWhere,
} from './event-reminder.repository';

const now = new Date('2026-11-27T12:00:00Z');

describe('event reminder persistence', () => {
  const prisma = mockDeep<PrismaService>();
  const repository = new EventReminderRepository(prisma);
  beforeEach(() => jest.clearAllMocks());

  it('selects published events starting 20–24 or 44–48 hours from now', () => {
    expect(eventRemindersWhere(now)).toEqual({
      status: 'published',
      OR: [
        {
          startsAt: {
            gt: new Date('2026-11-28T08:00:00Z'),
            lte: new Date('2026-11-28T12:00:00Z'),
          },
        },
        {
          startsAt: {
            gt: new Date('2026-11-29T08:00:00Z'),
            lte: new Date('2026-11-29T12:00:00Z'),
          },
        },
      ],
    });
  });

  it('pages the event ids with a stable cursor', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    await repository.findEventIds(now, 'last-id');
    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: { ...eventRemindersWhere(now), id: { gt: 'last-id' } },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 100,
    });
  });

  it('reads approved participations with what decides deliverability, not the maximum', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await repository.findEvent('event-1');
    const recipient = {
      select: {
        id: true,
        email: true,
        emailVerified: true,
        blockedAt: true,
        deletedAt: true,
      },
    };
    const { select } = prisma.event.findUnique.mock.calls[0][0];
    expect(select).toEqual(
      expect.objectContaining({
        status: true,
        minParticipants: true,
        organizer: recipient,
        participations: {
          where: { status: 'approved' },
          orderBy: { id: 'asc' },
          select: { user: recipient },
        },
      }),
    );
    expect(select).not.toHaveProperty('maxParticipants');
  });

  it('claims the reminder in the shared send log under its own key and type', async () => {
    prisma.notificationLog.createMany.mockResolvedValue({ count: 1 });
    prisma.notificationLog.updateMany.mockResolvedValue({ count: 1 });
    const token = await repository.claim(
      reminderEvent(),
      { kind: 'organizer-48h', userId: 'organizer', email: 'o@example.test' },
      now,
    );
    expect(token).toEqual(expect.any(String));
    expect(prisma.notificationLog.createMany).toHaveBeenCalledWith({
      data: {
        key: 'event-reminder:organizer-48h:event-1:organizer:2026-11-28T17:00:00.000Z',
        type: 'event-reminder-organizer-48h',
        eventId: 'event-1',
        userId: 'organizer',
      },
      skipDuplicates: true,
    });
    expect(prisma.notificationLog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ attempts: { lt: 3 }, sentAt: null }),
      }),
    );
  });

  it('a sent, exhausted or claimed key is not claimed again', async () => {
    prisma.notificationLog.createMany.mockResolvedValue({ count: 0 });
    prisma.notificationLog.updateMany.mockResolvedValue({ count: 0 });
    expect(
      await repository.claim(
        reminderEvent(),
        { kind: 'participant', userId: 'alice', email: 'a@example.test' },
        now,
      ),
    ).toBeNull();
  });
});
