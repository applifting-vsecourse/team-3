import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import { AgeConfirmationController } from './age-confirmation.controller';

jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const getSession = jest.mocked(getSessionFromRequest);
const request = {} as Request;

describe('AgeConfirmationController', () => {
  const prisma = mockDeep<PrismaService>();
  const controller = new AgeConfirmationController(mock<BetterAuth>(), prisma);
  beforeEach(() => jest.clearAllMocks());

  it('requires a signed-in account', async () => {
    getSession.mockResolvedValue(null);
    await expect(
      controller.confirm(request, { ageConfirmed: true }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('requires an explicit boolean confirmation', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } });
    for (const value of [
      null,
      {},
      { ageConfirmed: false },
      { ageConfirmed: 'true' },
    ]) {
      await expect(controller.confirm(request, value)).rejects.toThrow(
        BadRequestException,
      );
    }
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('records only the signed-in user once, with a server timestamp', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } });
    await expect(
      controller.confirm(request, { ageConfirmed: true, userId: 'other' }),
    ).resolves.toEqual({ confirmed: true });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', ageConfirmedAt: null },
      data: { ageConfirmedAt: expect.any(Date) },
    });
  });
});
