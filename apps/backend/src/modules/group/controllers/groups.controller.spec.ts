import { PrismaService } from '@/core/prisma/prisma.service';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  EMAIL_NOT_VERIFIED,
  VerifiedUserGuard,
} from '@/shared/auth/guards/verified-user.guard';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { mock, mockDeep } from 'jest-mock-extended';
import { GroupsController } from './groups.controller';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest; the guards here need neither.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

type Handler = keyof GroupsController;

const guardsOf = (handler: Handler): unknown[] =>
  Reflect.getMetadata(GUARDS_METADATA, GroupsController.prototype[handler]);

// where @ApiResponse keeps its responses (@nestjs/swagger's DECORATORS.API_RESPONSE)
const API_RESPONSE = 'swagger/apiResponse';

const forbiddenDescription = (handler: Handler): string | undefined =>
  Reflect.getMetadata(API_RESPONSE, GroupsController.prototype[handler])?.[
    '403'
  ]?.description;

// #236 (S-5): every request to join comes from a verified user — also from a
// session made before signing in needed a verified e-mail.
describe('GroupsController: who may join a group', () => {
  it('joining (or asking to join) needs a verified e-mail', () => {
    expect(guardsOf('join')).toEqual([VerifiedUserGuard]);
    // Swagger says so
    expect(forbiddenDescription('join')).toContain(EMAIL_NOT_VERIFIED);
  });

  it('leaving a group or withdrawing a request needs only a session', () => {
    expect(guardsOf('leave')).toEqual([AuthenticatedUserGuard]);
  });

  it('an unverified session asking to join gets 403 EMAIL_NOT_VERIFIED', async () => {
    jest
      .mocked(getSessionFromRequest)
      .mockResolvedValue({ user: { id: 'eva' } } as never);
    const prisma = mockDeep<PrismaService>();
    prisma.user.findUnique.mockResolvedValue({
      emailVerified: false,
      blockedAt: null,
    } as never);
    const guard = new VerifiedUserGuard(mock<BetterAuth>(), prisma);

    const error = await guard
      .canActivate({
        getHandler: () => GroupsController.prototype.join,
        getClass: () => GroupsController,
        switchToHttp: () => ({ getRequest: () => ({}) }),
      } as unknown as ExecutionContext)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: EMAIL_NOT_VERIFIED,
    });
  });
});
