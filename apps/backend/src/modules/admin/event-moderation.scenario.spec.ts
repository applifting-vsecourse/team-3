import { PrismaService } from '@/core/prisma/prisma.service';
import { EventModerationRepository } from '@/modules/admin/repositories/event-moderation.repository';
import { EventModerationService } from '@/modules/admin/services/event-moderation.service';
import { GROUP_INACTIVE_CANCEL_REASON } from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { ConflictException } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

type Status = 'published' | 'cancelled' | 'hidden' | 'deleted';
type EventRow = {
  id: string;
  groupId: string | null;
  status: Status;
  startsAt: Date;
  cancelReason: string | null;
};
type StatusWhere = Status | { in: Status[] };

const matchesStatus = (
  status: Status,
  where: StatusWhere | undefined,
): boolean =>
  where === undefined ||
  (typeof where === 'string' ? status === where : where.in.includes(status));

/**
 * The two repositories over one in-memory table of events, so the scenario
 * runs their real queries: what the group's deactivation writes is what
 * restoring then reads.
 */
const inMemory = (
  events: EventRow[],
): ReturnType<typeof mockDeep<PrismaService>> => {
  const prisma = mockDeep<PrismaService>();
  const byId = (id: string): EventRow | null =>
    events.find((event) => event.id === id) ?? null;
  prisma.$transaction.mockImplementation(((
    work: ((tx: PrismaService) => Promise<unknown>) | Promise<unknown>[],
  ) => (Array.isArray(work) ? Promise.all(work) : work(prisma))) as never);
  prisma.$executeRaw.mockResolvedValue(1 as never);
  prisma.event.findUnique.mockImplementation((({
    where,
  }: {
    where: { id: string };
  }) => Promise.resolve(byId(where.id))) as never);
  prisma.event.update.mockImplementation((({
    where,
    data,
  }: {
    where: { id: string };
    data: Partial<EventRow>;
  }) => Promise.resolve(Object.assign(byId(where.id)!, data))) as never);
  prisma.event.updateMany.mockImplementation((({
    where,
    data,
  }: {
    where: { groupId?: string; status?: StatusWhere; startsAt?: { gt: Date } };
    data: Partial<EventRow>;
  }) => {
    const hit = events.filter(
      (event) =>
        (where.groupId === undefined || event.groupId === where.groupId) &&
        matchesStatus(event.status, where.status) &&
        (where.startsAt === undefined || event.startsAt > where.startsAt.gt),
    );
    hit.forEach((event) => Object.assign(event, data));
    return Promise.resolve({ count: hit.length });
  }) as never);
  return prisma;
};

describe('a deactivated event of a group that is then deactivated (#308, review #380)', () => {
  const now = new Date('2026-11-20T10:00:00.000Z');
  const upcoming = new Date('2026-11-25T17:00:00.000Z');

  it('is cancelled with the group, and restoring it is 409 EVENT_NOT_HIDDEN', async () => {
    const event: EventRow = {
      id: 'e1',
      groupId: 'g1',
      status: 'published',
      startsAt: upcoming,
      cancelReason: null,
    };
    const prisma = inMemory([event]);
    const moderation = new EventModerationService(
      new EventModerationRepository(prisma),
    );

    // the superadmin deactivates the event
    await moderation.hideEvent('e1', 'admin1', 'Podvod');
    expect(event.status).toBe('hidden');

    // its group is deactivated: the event is cancelled like the others
    await new GroupRepository(prisma).deactivateGroup('g1', now);
    expect(event).toMatchObject({
      status: 'cancelled',
      cancelReason: GROUP_INACTIVE_CANCEL_REASON,
    });

    // „Obnovit“ no longer publishes it
    const error = (await moderation
      .unhideEvent('e1', 'admin1', now)
      .catch((e: unknown) => e)) as ConflictException;
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({ code: 'EVENT_NOT_HIDDEN' });
    expect(event.status).toBe('cancelled');
  });

  it("a past deactivated event stays deactivated, in the group's history", async () => {
    const event: EventRow = {
      id: 'e2',
      groupId: 'g1',
      status: 'hidden',
      startsAt: new Date('2026-11-01T17:00:00.000Z'),
      cancelReason: null,
    };

    await new GroupRepository(inMemory([event])).deactivateGroup('g1', now);

    expect(event.status).toBe('hidden');
  });
});
