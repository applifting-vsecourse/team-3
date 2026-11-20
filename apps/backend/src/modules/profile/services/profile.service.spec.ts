import type { ProfileRow } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { ProfileService } from './profile.service';

const row = (): ProfileRow => ({
  id: 'owner',
  name: 'Jana Nová',
  email: 'jana@example.com',
  emailVerified: true,
  bio: null,
  blockedAt: null,
  deletedAt: null,
  homeLocality: null,
  interests: [],
  accounts: [],
});

describe('ProfileService (#178)', () => {
  const repository = mock<ProfileRepository>();
  const service = new ProfileService(repository);
  beforeEach(() => {
    jest.clearAllMocks();
    repository.get.mockResolvedValue(row());
    repository.save.mockResolvedValue(row());
    repository.localityExists.mockResolvedValue(true);
    repository.interestsExist.mockResolvedValue(true);
  });

  it('saves the optional bio privately with the initial preferences', async () => {
    const onboardingCompletedAt = new Date('2026-11-21T12:00:00Z');
    repository.finishOnboarding.mockResolvedValue({
      onboardingCompletedAt,
      homeLocality: { slug: 'brno' },
      _count: { interests: 3 },
    });

    await service.finishOnboarding('owner', {
      homeLocalityId: 'brno',
      interestIds: ['walking', 'running', 'games'],
      bio: '  Hledám partu na výlety.  ',
    });

    expect(repository.finishOnboarding).toHaveBeenCalledWith(
      'owner',
      expect.objectContaining({
        bio: 'Hledám partu na výlety.',
        bioVisibility: 'nobody',
      }),
    );
  });

  it('never updates omitted fields and uses only the session owner ID', async () => {
    await service.update('owner', { name: '  Jana Nová  ' });
    expect(repository.save).toHaveBeenCalledWith('owner', {
      name: 'Jana Nová',
      updatedAt: expect.any(Date),
    });
    expect(repository.get).toHaveBeenCalledWith('owner');
  });
  it('saves the name without the spaces around it (#199)', async () => {
    await service.update('owner', { name: ' Anna Marie Nová   ' });
    expect(repository.save).toHaveBeenCalledWith('owner', {
      name: 'Anna Marie Nová',
      updatedAt: expect.any(Date),
    });
  });
  it('clears the locality and replaces interests in one nested update', async () => {
    await service.update('owner', { homeLocalityId: null, interestIds: [] });
    expect(repository.save).toHaveBeenCalledWith('owner', {
      homeLocality: { disconnect: true },
      interests: { deleteMany: {}, create: [] },
      updatedAt: expect.any(Date),
    });
  });
  it.each(['Jana 123', '🙂', 'A', 'x'.repeat(61), '', '   '])(
    'rejects invalid names before persistence (%s)',
    async (name) => {
      await expect(service.update('owner', { name })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it('rejects a locality outside the catalog', async () => {
    repository.localityExists.mockResolvedValue(false);
    await expect(
      service.update('owner', { homeLocalityId: 'unknown' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('rejects an unknown activity without deleting existing interests', async () => {
    repository.interestsExist.mockResolvedValue(false);
    await expect(
      service.update('owner', { interestIds: ['unknown'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('rejects deleted accounts before returning history', async () => {
    repository.get.mockResolvedValue({ ...row(), deletedAt: new Date() });
    await expect(service.overview('owner')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repository.overview).not.toHaveBeenCalled();
  });
  it('blocks profile edits after moderation without allowing a session cache to bypass it', async () => {
    repository.get.mockResolvedValue({ ...row(), blockedAt: new Date() });
    await expect(
      service.update('owner', { name: 'Jana Nová' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
