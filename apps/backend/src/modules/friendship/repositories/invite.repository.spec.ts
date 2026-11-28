import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { InviteRepository } from './invite.repository';

const CODE = 'q3Zr1hXkE0bLw9yT2vNcAa';
const now = new Date('2026-11-23T10:00:00.000Z');

const setup = (): {
  prisma: DeepMockProxy<PrismaService>;
  repository: InviteRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  return { prisma, repository: new InviteRepository(prisma) };
};

const taken = (): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('InviteRepository (#406)', () => {
  it('finds the inviter only on a verified account neither blocked nor deleted, with 3 interests', async () => {
    const { prisma, repository } = setup();
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      name: 'Tomáš Novák',
      interests: [
        { activity: { name: 'Běh' } },
        { activity: { name: 'Volejbal' } },
      ],
    } as never);

    await expect(repository.findInviter(CODE)).resolves.toEqual({
      id: 'u1',
      name: 'Tomáš Novák',
      interests: ['Běh', 'Volejbal'],
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          inviteCode: CODE,
          emailVerified: true,
          deletedAt: null,
          blockedAt: null,
        },
      }),
    );
  });

  it('gives a code only to a user without one', async () => {
    const { prisma, repository } = setup();
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.assignCode('u1', CODE)).resolves.toBe(false);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', inviteCode: null },
      data: { inviteCode: CODE },
    });
  });

  it('a code taken by somebody else is no error', async () => {
    const { prisma, repository } = setup();
    prisma.user.updateMany.mockRejectedValue(taken());
    prisma.user.update.mockRejectedValue(taken());

    await expect(repository.assignCode('u1', CODE)).resolves.toBe(false);
    await expect(repository.replaceCode('u1', CODE)).resolves.toBe(false);
  });

  it('claims the invitee only when nobody did yet', async () => {
    const { prisma, repository } = setup();
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.claim('u2', 'u1', now)).resolves.toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u2', invitedById: null },
      data: { invitedById: 'u1', invitedAt: now },
    });
  });

  it('counts the invited, since a moment for the daily limit', async () => {
    const { prisma, repository } = setup();
    prisma.user.count.mockResolvedValue(2);

    await expect(repository.countInvited('u1', now)).resolves.toBe(2);
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { invitedById: 'u1', invitedAt: { gte: now } },
    });
    await repository.countInvited('u1');
    expect(prisma.user.count).toHaveBeenLastCalledWith({
      where: { invitedById: 'u1' },
    });
  });
});
