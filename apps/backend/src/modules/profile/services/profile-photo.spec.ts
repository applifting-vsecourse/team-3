import {
  detectImageType,
  IMAGE_MAX_BYTES,
} from '@/modules/image/domain/uploaded-image';
import type { ProfileRow } from '@/modules/profile/domain/profile';
import type { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { mock, mockReset } from 'jest-mock-extended';
import * as sharp from 'sharp';
import { ProfileService } from './profile.service';

const owner = 'profile-owner';
const row = {
  id: owner,
  name: 'Jana Nová',
  email: 'jana@example.test',
  emailVerified: true,
  blockedAt: null,
  deletedAt: null,
  bio: null,
  photoImageKey: null,
  photoVisibility: 'everyone',
  bioVisibility: 'everyone',
  pastEventsVisibility: 'friends',
  interests: [],
  homeLocality: null,
  accounts: [],
} satisfies ProfileRow;
const preferences = {
  homeLocalityId: 'brno',
  interestIds: ['running', 'hiking', 'games'],
};
const completedAt = new Date('2026-11-21T15:00:00.000Z');

describe('profile photos', () => {
  const repository = mock<ProfileRepository>();
  const service = new ProfileService(repository);
  let png: Buffer;

  beforeAll(async () => {
    png = await sharp({
      create: { width: 600, height: 320, channels: 3, background: '#62bb76' },
    })
      .withMetadata({ exif: { IFD0: { Artist: 'HobbyHub QA' } } })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    mockReset(repository);
    repository.get.mockResolvedValue(row);
    repository.save.mockResolvedValue(row);
    repository.localityExists.mockResolvedValue(true);
    repository.interestsExist.mockResolvedValue(true);
    repository.finishOnboarding.mockResolvedValue({
      name: 'Jana Nová',
      homeLocality: { slug: 'brno' },
      _count: { interests: 3 },
      onboardingCompletedAt: completedAt,
    });
  });

  it('writes the resized image and the settings in one save and leaves the auth image untouched', async () => {
    await service.update(
      owner,
      { name: 'Anna Nová', bio: ' Pojďme ven. ' },
      { bytes: png },
    );
    expect(repository.save).toHaveBeenCalledTimes(1);
    const [id, data, image] = repository.save.mock.calls[0];
    expect(id).toBe(owner);
    expect(data).toMatchObject({ name: 'Anna Nová', bio: 'Pojďme ven.' });
    expect(data).not.toHaveProperty('image');
    if (!image) throw new Error('Expected the photo');
    // stored as every uploaded image (#77): WebP, with the small variant for avatars
    expect(image.contentType).toBe('image/webp');
    expect(detectImageType(image.data)).toBe('image/webp');
    expect(detectImageType(image.small)).toBe('image/webp');
    const metadata = await sharp(image.data).metadata();
    expect(metadata.width).toBe(600);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.iptc).toBeUndefined();
    expect((await sharp(image.small).metadata()).width).toBe(480);
  });

  it('snapshots a photo together with the initial location and interests', async () => {
    await expect(
      service.finishOnboarding(
        owner,
        { ...preferences, bio: 'Let’s go!', bioVisibility: 'friends' },
        png,
      ),
    ).resolves.toMatchObject({
      onboardingCompletedAt: completedAt,
      localitySlug: 'brno',
    });
    expect(repository.finishOnboarding).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({
        homeLocality: { connect: { id: 'brno' } },
        interests: {
          deleteMany: {},
          create: preferences.interestIds.map((id) => ({
            activity: { connect: { id } },
          })),
        },
        bio: 'Let’s go!',
        bioVisibility: 'friends',
      }),
      expect.objectContaining({ contentType: 'image/webp' }),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('refuses a blocked account before a profile change', async () => {
    repository.get.mockResolvedValue({ ...row, blockedAt: completedAt });
    await expect(
      service.update(owner, {}, { bytes: png }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    ['empty image', Buffer.alloc(0)],
    [
      'text with an image extension',
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    ],
    ['invalid JPEG', Buffer.from([0xff, 0xd8, 0xff, 0x0a])],
    ['too many bytes', Buffer.alloc(IMAGE_MAX_BYTES + 1)],
  ])(
    'refuses a %s before writing either settings or completion',
    async (_, bytes) => {
      await expect(
        service.update(owner, { name: 'Anna Nová' }, { bytes }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_PHOTO' } });
      await expect(
        service.finishOnboarding(owner, preferences, bytes),
      ).rejects.toMatchObject({ response: { code: 'INVALID_PHOTO' } });
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.finishOnboarding).not.toHaveBeenCalled();
    },
  );

  it('rejects an upload and deletion in the same profile edit', async () => {
    await expect(
      service.update(owner, {}, { bytes: png, remove: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('can remove the photo while changing another field', async () => {
    await expect(
      service.update(owner, { name: 'Anna Nová' }, { remove: true }),
    ).resolves.toMatchObject({ photoKey: null });
    expect(repository.save).toHaveBeenCalledWith(
      owner,
      { name: 'Anna Nová', updatedAt: expect.any(Date) },
      null,
    );
  });

  it('removes the photo alone, without any other field', async () => {
    await service.update(owner, {}, { remove: true });
    expect(repository.save).toHaveBeenCalledWith(
      owner,
      { updatedAt: expect.any(Date) },
      null,
    );
  });

  it('leaves the photo as it is when the edit carries none', async () => {
    await service.update(owner, { bio: 'Ahoj' });
    expect(repository.save).toHaveBeenCalledWith(owner, {
      bio: 'Ahoj',
      updatedAt: expect.any(Date),
    });
  });
});
