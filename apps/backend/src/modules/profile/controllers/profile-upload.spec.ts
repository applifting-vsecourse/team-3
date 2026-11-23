import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { OnboardingProfileDto } from './dto/onboarding.dto';
import { UpdateProfileWithPhotoDto } from './dto/update-profile.dto';
import { ProfilePayloadPipe } from './profile-upload';

describe('multipart profile metadata', () => {
  const edit = new ProfilePayloadPipe(UpdateProfileWithPhotoDto);
  const onboard = new ProfilePayloadPipe(OnboardingProfileDto);
  const place = 'brno';
  const interests = ['hiking', 'volleyball', 'cycling'];
  const baseline = { homeLocalityId: place, interestIds: interests };

  it('hydrates all settings alongside a photo for the existing profile', async () => {
    const payload = {
      name: 'Anna Nová',
      bio: 'Ráda vyrážím do kopců.',
      homeLocalityId: place,
      interestIds: interests,
      removePhoto: false,
    };
    const result = await edit.transform(JSON.stringify(payload));
    expect(result).toBeInstanceOf(UpdateProfileWithPhotoDto);
    expect(result).toMatchObject(payload);
  });

  it('supports a photo-only edit and repeatable removal without settings', async () => {
    const empty = await edit.transform('{}');
    expect(empty.name).toBeUndefined();
    expect(empty.removePhoto).toBeUndefined();
    await expect(edit.transform('{"removePhoto":true}')).resolves.toMatchObject(
      {
        removePhoto: true,
      },
    );
  });

  it('allows ordinary edits to clear location, bio and interests', async () => {
    const cleared = { homeLocalityId: null, bio: null, interestIds: [] };
    await expect(
      edit.transform(JSON.stringify(cleared)),
    ).resolves.toMatchObject(cleared);
  });

  it('allows an optional fourth interest and optional name and bio during onboarding', async () => {
    const values = {
      ...baseline,
      interestIds: [...interests, 'drawing'],
      name: 'Anna Nová',
      bio: 'Těším se na akce.',
    };
    const result = await onboard.transform(JSON.stringify(values));
    expect(result).toBeInstanceOf(OnboardingProfileDto);
    expect(result).toMatchObject(values);
  });

  it('takes one interest during onboarding too, as the wizard (#296)', async () => {
    await expect(
      onboard.transform(
        JSON.stringify({ homeLocalityId: place, interestIds: ['hiking'] }),
      ),
    ).resolves.toMatchObject({ interestIds: ['hiking'] });
  });

  it('takes who sees the photo, bio and visited events with the photo (#64)', async () => {
    const visibility = {
      photoVisibility: 'friends',
      bioVisibility: 'organizers',
      pastEventsVisibility: 'nobody',
    };
    await expect(
      edit.transform(JSON.stringify(visibility)),
    ).resolves.toMatchObject(visibility);
    await expect(
      onboard.transform(JSON.stringify({ ...baseline, ...visibility })),
    ).resolves.toMatchObject(visibility);
  });

  it('accepts all 50 interests allowed by profile settings', async () => {
    const values = {
      homeLocalityId: place,
      interestIds: Array.from(
        { length: 50 },
        (_, index) => `activity-${index}`,
      ),
    };
    await expect(
      onboard.transform(JSON.stringify(values)),
    ).resolves.toMatchObject(values);
  });

  it.each([
    ['omitted part', undefined],
    ['repeated part', ['{}', '{}']],
    ['object rather than JSON-encoded part', {}],
    ['scalar', '42'],
    ['empty string', ''],
    ['broken JSON', '{"name":'],
    ['null', 'null'],
    ['array', '[]'],
    ['quoted JSON string', '"{}"'],
    ['oversized metadata', JSON.stringify({ bio: 'ě'.repeat(9_000) })],
  ])('rejects %s before trying to validate settings', async (_, value) => {
    await expect(edit.transform(value)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(onboard.transform(value)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    { userId: 'someone-else' },
    { email: 'someone-else@example.test' },
    { photoKey: 'someone-elses-photo' },
    { photoImageKey: 'someone-elses-photo' },
    { photoVisibility: 'public' },
    { blockedAt: null },
    { removePhoto: 'false' },
    { removePhoto: null },
    { name: null },
    { name: 42 },
    { homeLocalityId: ['brno'] },
    { homeLocalityId: 'x'.repeat(101) },
    { interestIds: null },
    { interestIds: ['hiking', 'hiking'] },
    { interestIds: [5] },
    { interestIds: 'hiking' },
    { interestIds: Array.from({ length: 51 }, (_, index) => String(index)) },
    { bio: 12 },
    { bio: 'x'.repeat(501) },
  ])('rejects invalid or unexpected setting %#', async (invalid) => {
    await expect(
      edit.transform(JSON.stringify(invalid)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { homeLocalityId: undefined },
    { homeLocalityId: null },
    { homeLocalityId: '' },
    { interestIds: undefined },
    { interestIds: [] },
    { interestIds: ['hiking', 'cycling', 'cycling'] },
    { interestIds: ['hiking', 'cycling', ''] },
    { interestIds: ['hiking', 'cycling', 'x'.repeat(101)] },
    { interestIds: Array.from({ length: 51 }, (_, index) => String(index)) },
    { removePhoto: false },
    { onboardingCompletedAt: null },
  ])('requires validated choices on first save %#', async (invalid) => {
    await expect(
      onboard.transform(JSON.stringify({ ...baseline, ...invalid })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('strips inherited keys without passing them on to the repository', async () => {
    const payload = '{"__proto__":{"role":"admin"},"name":"Anna Nová"}';
    const result = await edit.transform(payload);
    expect(result.name).toBe('Anna Nová');
    expect(result).not.toHaveProperty('role');
    expect({}).not.toHaveProperty('role');
  });
});
