import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PartnerSuggestionsQueryDto } from './partner.dto';

// the controller's pipe, on the raw query string
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const check = (value: unknown): Promise<unknown> =>
  pipe.transform(value, {
    type: 'query',
    metatype: PartnerSuggestionsQueryDto,
  });

describe('PartnerSuggestionsQueryDto (#84)', () => {
  it('accepts an empty query', async () => {
    await expect(check({})).resolves.toEqual({});
  });

  it.each(['10', '25', '50'])(
    'takes the radius %s km as a number',
    async (radiusKm) => {
      await expect(check({ radiusKm })).resolves.toEqual({
        radiusKm: Number(radiusKm),
      });
    },
  );

  it('takes a cursor as given', async () => {
    await expect(check({ cursor: 'WzEsMSwyLCJwMSJd' })).resolves.toEqual({
      cursor: 'WzEsMSwyLCJwMSJd',
    });
  });

  it.each([
    { radiusKm: '15' },
    { radiusKm: '100' },
    { radiusKm: 'daleko' },
    { cursor: 'not/base64url=' },
    { cursor: 'x'.repeat(301) },
    { viewerId: 'someone-else' },
    { limit: '500' },
  ])('refuses %j', async (query) => {
    await expect(check(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
