import { PrismaService } from '@/core/prisma/prisma.service';
import {
  decideHide,
  decideUnhide,
} from '@/modules/admin/domain/event-moderation';
import { mockDeep } from 'jest-mock-extended';
import { EventModerationRepository } from './event-moderation.repository';

const now = new Date('2026-11-20T10:00:00.000Z');

const setup = (
  status: 'published' | 'cancelled' | 'hidden' | 'deleted' | null,
): {
  prisma: ReturnType<typeof mockDeep<PrismaService>>;
  repository: EventModerationRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  // the transaction client is the same mock
  prisma.$transaction.mockImplementation(((
    run: (tx: PrismaService) => Promise<unknown>,
  ) => run(prisma)) as never);
  prisma.event.findUnique.mockResolvedValue(
    (status ? { status } : null) as never,
  );
  return { prisma, repository: new EventModerationRepository(prisma) };
};

describe('EventModerationRepository.hideEvent (#308)', () => {
  it('locks the event, hides it and writes hide_event with who and why', async () => {
    const { prisma, repository } = setup('published');

    await expect(
      repository.hideEvent('e1', 'admin1', 'Podvod', decideHide),
    ).resolves.toEqual({ ok: true });

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'hidden' },
    });
    expect(prisma.moderationAction.create).toHaveBeenCalledWith({
      data: {
        type: 'hide_event',
        targetType: 'event',
        targetId: 'e1',
        reason: 'Podvod',
        adminId: 'admin1',
      },
    });
  });

  it('a refused deactivation writes nothing', async () => {
    const { prisma, repository } = setup('cancelled');

    await expect(
      repository.hideEvent('e1', 'admin1', 'Podvod', decideHide),
    ).resolves.toEqual({ ok: false, refusal: 'EVENT_CANCELLED' });
    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(prisma.moderationAction.create).not.toHaveBeenCalled();
  });

  it.each([null, 'deleted'] as const)(
    'an event that is %s is null (404)',
    async (status) => {
      const { prisma, repository } = setup(status);

      await expect(
        repository.hideEvent('e1', 'admin1', 'Podvod', decideHide),
      ).resolves.toBeNull();
      expect(prisma.moderationAction.create).not.toHaveBeenCalled();
    },
  );
});

describe('EventModerationRepository.unhideEvent (#308)', () => {
  it('publishes the event again and marks its deactivation reverted', async () => {
    const { prisma, repository } = setup('hidden');

    await expect(
      repository.unhideEvent('e1', 'admin2', now, decideUnhide),
    ).resolves.toEqual({ ok: true });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'published' },
    });
    expect(prisma.moderationAction.updateMany).toHaveBeenCalledWith({
      where: {
        type: 'hide_event',
        targetType: 'event',
        targetId: 'e1',
        revertedAt: null,
      },
      data: { revertedAt: now, revertedById: 'admin2' },
    });
  });

  it('an event that is not deactivated stays as it is', async () => {
    const { prisma, repository } = setup('published');

    await expect(
      repository.unhideEvent('e1', 'admin2', now, decideUnhide),
    ).resolves.toEqual({ ok: false, refusal: 'EVENT_NOT_HIDDEN' });
    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(prisma.moderationAction.updateMany).not.toHaveBeenCalled();
  });
});
