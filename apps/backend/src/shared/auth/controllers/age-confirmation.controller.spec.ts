import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import {
  BadRequestException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import { AgeConfirmationController } from './age-confirmation.controller';
import { ConfirmAgeDto } from './dto/confirm-age.dto';

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
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    for (const value of [
      null,
      {},
      { ageConfirmed: false },
      { ageConfirmed: 'true' },
      { ageConfirmed: 1 },
    ]) {
      await expect(
        pipe.transform(value, { type: 'body', metatype: ConfirmAgeDto }),
      ).rejects.toThrow(BadRequestException);
    }
    await expect(
      pipe.transform(
        { ageConfirmed: true, userId: 'other' },
        { type: 'body', metatype: ConfirmAgeDto },
      ),
    ).resolves.toEqual({ ageConfirmed: true });
  });

  it('records only the signed-in user once, with a server timestamp', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } });
    await expect(
      controller.confirm(request, { ageConfirmed: true }),
    ).resolves.toEqual({ confirmed: true });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', ageConfirmedAt: null },
      data: { ageConfirmedAt: expect.any(Date) },
    });
  });
});
