import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AcceptInviteDto } from './invite.dto';

const invalidOf = (body: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(AcceptInviteDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe('AcceptInviteDto (#406)', () => {
  it.each([true, false])('takes befriend: %p', (befriend) => {
    expect(invalidOf({ befriend })).toEqual([]);
  });

  it.each([{}, { befriend: 'yes' }, { befriend: null }])(
    'refuses %o',
    (body) => {
      expect(invalidOf(body)).toEqual(['befriend']);
    },
  );

  it('refuses anything else in the body', () => {
    expect(invalidOf({ befriend: true, inviterId: 'x' })).toEqual([
      'inviterId',
    ]);
  });
});
