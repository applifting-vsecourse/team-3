import { PartnerService } from '@/modules/partner/services/partner.service';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import { WriteThrottlerGuard } from '@/shared/rate-limit/rate-limit.guards';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { mock } from 'jest-mock-extended';
import { PartnersController } from './partners.controller';

// the real guard pulls in BetterAuth (ESM); here only which guard is on each route matters
jest.mock('@/shared/auth/guards/verified-user.guard', () => ({
  VerifiedUserGuard: class VerifiedUserGuard {},
}));

const guardsOf = (handler: keyof PartnersController): unknown[] =>
  Reflect.getMetadata(
    GUARDS_METADATA,
    PartnersController.prototype[handler],
  ) as unknown[];

const user = { id: 'me' } as never;

describe('PartnersController (#84)', () => {
  it('reading the deck needs a verified, unblocked account', () => {
    expect(guardsOf('suggestions')).toEqual([VerifiedUserGuard]);
  });

  it.each(['request', 'skip', 'unskip'] as const)(
    '%s needs a verified, unblocked account and is a limited write',
    (handler) => {
      expect(guardsOf(handler)).toEqual([
        VerifiedUserGuard,
        WriteThrottlerGuard,
      ]);
    },
  );

  it('reads the deck for the session’s user, from 10 km by default', async () => {
    const partners = mock<PartnerService>();
    const controller = new PartnersController(partners);

    await controller.suggestions({}, user);

    expect(partners.suggestions).toHaveBeenCalledWith('me', 10, undefined);
  });

  it('Přidat over the day’s limit answers 429 FRIEND_REQUEST_DAILY_LIMIT', async () => {
    const partners = mock<PartnerService>();
    partners.request.mockRejectedValue(
      new HttpException(
        { code: 'FRIEND_REQUEST_DAILY_LIMIT' },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
    const controller = new PartnersController(partners);

    const error = (await controller
      .request('other', user)
      .catch((caught: unknown) => caught)) as HttpException;

    expect(error.getStatus()).toBe(429);
    expect(error.getResponse()).toMatchObject({
      code: 'FRIEND_REQUEST_DAILY_LIMIT',
    });
  });
});
