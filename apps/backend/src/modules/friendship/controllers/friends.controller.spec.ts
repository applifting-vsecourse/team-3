import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { FriendsController } from './friends.controller';

// the real guards pull in BetterAuth (ESM); the controller is called directly here
jest.mock('@/shared/auth/guards/verified-user.guard', () => ({
  VerifiedUserGuard: class VerifiedUserGuard {},
}));
jest.mock('@/shared/auth/guards/authenticated-user.guard', () => ({
  AuthenticatedUserGuard: class AuthenticatedUserGuard {},
}));

describe('FriendsController: the daily limit (#84)', () => {
  it('POST /api/friends/:userId over the day’s limit answers 429 FRIEND_REQUEST_DAILY_LIMIT, as Najdi parťáka', async () => {
    const friends = mock<FriendshipService>();
    friends.request.mockRejectedValue(
      new HttpException(
        { code: 'FRIEND_REQUEST_DAILY_LIMIT' },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
    const controller = new FriendsController(friends);

    const error = (await controller
      .request('other', { id: 'me' } as never)
      .catch((caught: unknown) => caught)) as HttpException;

    expect(error.getStatus()).toBe(429);
    expect(error.getResponse()).toMatchObject({
      code: 'FRIEND_REQUEST_DAILY_LIMIT',
    });
  });
});
