import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DeleteAccountDto } from './delete-account.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const check = (value: unknown): Promise<unknown> =>
  pipe.transform(value, { type: 'body', metatype: DeleteAccountDto });

describe('DELETE /api/me body (#64)', () => {
  it.each([
    { userId: 'victim' },
    { password: 123 },
    { confirmation: ['smazat účet'] },
    { password: 'x'.repeat(129) },
    { confirmation: 'x'.repeat(101) },
  ])('refuses %j', async (input) => {
    await expect(check(input)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('takes a password as typed, spaces included, or the phrase', async () => {
    await expect(check({ password: ' Tajne 123 ' })).resolves.toEqual({
      password: ' Tajne 123 ',
    });
    await expect(check({ confirmation: 'smazat účet' })).resolves.toEqual({
      confirmation: 'smazat účet',
    });
  });
});
