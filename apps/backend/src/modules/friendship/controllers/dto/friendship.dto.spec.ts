import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateFriendshipDto } from './friendship.dto';

const invalidOf = (body: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(UpdateFriendshipDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe('UpdateFriendshipDto (#307)', () => {
  it('takes a rejection', () => {
    expect(invalidOf({ status: 'rejected' })).toEqual([]);
  });

  // accepting is POST (Přidat do přátel), removing is DELETE
  it.each([{}, { status: 'accepted' }, { status: 'pending' }])(
    'refuses %o',
    (body) => {
      expect(invalidOf(body)).toEqual(['status']);
    },
  );

  it('refuses anything else in the body', () => {
    expect(invalidOf({ status: 'rejected', requesterId: 'x' })).toEqual([
      'requesterId',
    ]);
  });
});
