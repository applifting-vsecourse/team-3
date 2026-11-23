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

  // #64, B-013: bio at most 500 characters, as the database's VarChar(500)
  it.each([
    { label: 'a 500-character bio', input: { bio: 'ž'.repeat(500) } },
    { label: 'an empty bio', input: { bio: '' } },
    { label: 'a cleared bio', input: { bio: null } },
  ])('accepts $label', async ({ input }) => {
    await expect(check(input)).resolves.toMatchObject(input);
  });

  it('refuses a bio over 500 characters with a Czech message', async () => {
    const error = await check({ bio: 'ž'.repeat(501) }).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(
      JSON.stringify((error as BadRequestException).getResponse()),
    ).toMatch('Napiš o sobě nejvýš 500 znaků.');
  });

  it.each([{ bio: 42 }, { bio: ['text'] }])(
    'refuses a bio that is not text (%j)',
    async (input) => {
      await expect(check(input)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  // B-014, #64: who sees the photo, the bio and the visited events
  it('accepts every visibility for each of the three fields', async () => {
    for (const value of ['everyone', 'friends', 'organizers', 'nobody']) {
      await expect(
        check({
          photoVisibility: value,
          bioVisibility: value,
          pastEventsVisibility: value,
        }),
      ).resolves.toMatchObject({ photoVisibility: value });
    }
  });

  it.each([
    { photoVisibility: 'public' },
    { bioVisibility: null },
    { pastEventsVisibility: 'friendsOfFriends' },
    { emailVisibility: 'everyone' },
  ])('refuses an unknown visibility (%j)', async (input) => {
    await expect(check(input)).rejects.toBeInstanceOf(BadRequestException);
  });
});
