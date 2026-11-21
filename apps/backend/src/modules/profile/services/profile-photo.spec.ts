import {
  detectImageType,
  IMAGE_MAX_BYTES,
} from '@/modules/image/domain/uploaded-image';
import type { ProfileRow } from '@/modules/profile/domain/profile';
import type { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock, mockReset } from 'jest-mock-extended';
import * as sharp from 'sharp';
import { ProfileService } from './profile.service';

const owner = 'profile-owner';
const version = '8959ce23-cbbf-4ae1-99a0-37ff776d7673';
const row = {
  id: owner,
  name: 'Jana Nová',
  email: 'jana@example.test',
  emailVerified: true,
  blockedAt: null,
  deletedAt: null,
  bio: null,
  profilePhoto: null,
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
    repository.saveWithoutPhoto.mockResolvedValue(row);
    repository.localityExists.mockResolvedValue(true);
    repository.interestsExist.mockResolvedValue(true);
    repository.finishOnboarding.mockResolvedValue({
      name: 'Jana Nová',
      homeLocality: { slug: 'brno' },
      _count: { interests: 3 },
      onboardingCompletedAt: completedAt,
    });
  });

  it('writes resized bytes and settings in one update and leaves the auth image untouched', async () => {
    await service.update(
      owner,
      { name: 'Anna Nová', bio: ' Pojďme ven. ' },
      { bytes: png },
    );
    expect(repository.save).toHaveBeenCalledTimes(1);
    const [id, data] = repository.save.mock.calls[0];
    expect(id).toBe(owner);
    expect(data).toMatchObject({ name: 'Anna Nová', bio: 'Pojďme ven.' });
    expect(data).not.toHaveProperty('image');
    const photo = data.profilePhoto?.upsert;
    if (!photo || !photo.create.data) throw new Error('Expected photo data');
    expect(photo.create.version).toMatch(/^[0-9a-f-]{36}$/);
    expect(photo.update).toEqual(photo.create);
    expect(detectImageType(photo.create.data)).toBe('image/webp');
    const metadata = await sharp(photo.create.data).metadata();
    expect(metadata.width).toBe(480);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.iptc).toBeUndefined();
  });

  it('snapshots a photo together with the initial location and interests', async () => {
    await expect(
      service.finishOnboarding(
        owner,
        { ...preferences, bio: 'Let’s go!' },
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
        bioVisibility: 'nobody',
        profilePhoto: {
          upsert: { create: expect.any(Object), update: expect.any(Object) },
        },
      }),
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
    expect(repository.saveWithoutPhoto).not.toHaveBeenCalled();
  });

  it('can remove the photo while changing another field', async () => {
    await expect(
      service.update(owner, { name: 'Anna Nová' }, { remove: true }),
    ).resolves.toMatchObject({ photoVersion: null });
    expect(repository.saveWithoutPhoto).toHaveBeenCalledWith(owner, {
      name: 'Anna Nová',
      updatedAt: expect.any(Date),
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('gives a replacement image its own version', async () => {
    await service.update(owner, {}, { bytes: png });
    await service.update(owner, {}, { bytes: png });
    const versions = repository.save.mock.calls.map(
      ([, data]) => data.profilePhoto?.upsert?.create.version,
    );
    expect(versions).toHaveLength(2);
    expect(versions[0]).not.toBe(versions[1]);
  });

  it('reads a specific version using the signed-in owner', async () => {
    repository.getPhoto.mockResolvedValueOnce({ data: png });
    await expect(service.getPhoto(owner, version)).resolves.toBe(png);
    expect(repository.getPhoto).toHaveBeenCalledWith(owner, version);
  });

  it('uses one missing response for another owner or obsolete version', async () => {
    repository.getPhoto.mockResolvedValue(null);
    await expect(service.getPhoto('other', version)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getPhoto(owner, version)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
