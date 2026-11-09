import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateProfileDto } from './update-profile.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const check = (value: unknown): Promise<unknown> =>
  pipe.transform(value, { type: 'body', metatype: UpdateProfileDto });

describe('profile request boundary (#178)', () => {
  it.each([
    { userId: 'victim' },
    { role: 'admin' },
    { email: 'other@example.com' },
    { emailVerified: true },
    { name: null },
    { interestIds: null },
    { interestIds: ['a', 'a'] },
    { interestIds: Array.from({ length: 51 }, (_, i) => String(i)) },
  ])(
    'refuses identity/auth fields and invalid update shapes (%j)',
    async (input) => {
      await expect(check(input)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
  it('allows explicitly clearing the locality and interests', async () => {
    await expect(
      check({ homeLocalityId: null, interestIds: [] }),
    ).resolves.toMatchObject({ homeLocalityId: null, interestIds: [] });
  });
});
