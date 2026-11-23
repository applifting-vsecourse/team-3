import type { ProfileRow } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { nameProblem } from '@/shared/auth/domain/name-policy';
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
  photoImageKey: null,
  photoVisibility: 'everyone',
  bioVisibility: 'everyone',
  pastEventsVisibility: 'friends',
  blockedAt: null,
  deletedAt: null,
  homeLocality: null,
  interests: [],
  accounts: [],
});

describe('ProfileService.finishOnboarding (#296)', () => {
  const repository = mock<ProfileRepository>();
  const service = new ProfileService(repository);
  const onboardingCompletedAt = new Date('2026-11-21T12:00:00Z');
  const localPreferences = {
    homeLocalityId: 'brno',
    interestIds: ['walking', 'running', 'games'],
  };
  const saved = {
    onboardingCompletedAt,
    name: 'Jana Nová',
    homeLocality: { slug: 'brno' },
    _count: { interests: 3 },
  };
  const nestedPreferences = {
    homeLocality: { connect: { id: 'brno' } },
    interests: {
      deleteMany: {},
      create: [
        { activity: { connect: { id: 'walking' } } },
        { activity: { connect: { id: 'running' } } },
        { activity: { connect: { id: 'games' } } },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.localityExists.mockResolvedValue(true);
    repository.interestsExist.mockResolvedValue(true);
    repository.finishOnboarding.mockResolvedValue(saved);
  });

  it('trims and saves the optional name with the profile fields in one request', async () => {
    const displayName = '  Anna-Marie O’Neil  ';
    const savedName = 'Anna-Marie O’Neil';
    repository.finishOnboarding.mockResolvedValue({
      ...saved,
      name: savedName,
    });

    await expect(
      service.finishOnboarding('owner', {
        ...localPreferences,
        displayName,
        bio: '  Hledám partu na výlety.  ',
      }),
    ).resolves.toEqual({
      onboardingCompletedAt,
      localitySlug: 'brno',
      hasInterests: true,
      displayName: savedName,
    });

    expect(repository.finishOnboarding).toHaveBeenCalledTimes(1);
    expect(repository.finishOnboarding).toHaveBeenCalledWith('owner', {
      ...nestedPreferences,
      name: savedName,
      bio: 'Hledám partu na výlety.',
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    'Jana 123',
    '🙂',
    'A',
    'x'.repeat(61),
    '',
    '   ',
    'Jana\tNová',
    '--',
  ])(
    'applies the shared profile name rules before writing (%j)',
    async (displayName) => {
      const problem = nameProblem(displayName);
      expect(problem).not.toBeNull();
      await expect(
        service.finishOnboarding('owner', {
          ...localPreferences,
          displayName,
        }),
      ).rejects.toMatchObject({
        response: { code: 'INVALID_NAME', message: problem },
      });
      expect(repository.finishOnboarding).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: 'omitted optional fields', fields: {} },
    {
      label: 'explicit nulls from JSON',
      fields: { displayName: null, bio: null },
    },
    { label: 'empty bio', fields: { bio: '' } },
    { label: 'whitespace-only bio', fields: { bio: '  \n\t ' } },
  ])(
    'leaves the existing name and bio intact with $label',
    async ({ fields }) => {
      const input = {
        ...localPreferences,
        ...fields,
      };

      await expect(
        service.finishOnboarding('owner', input),
      ).resolves.toMatchObject({
        displayName: saved.name,
      });
      expect(repository.finishOnboarding).toHaveBeenCalledWith(
        'owner',
        nestedPreferences,
      );
    },
  );

  it('returns the previously saved values if the write had already completed', async () => {
    await expect(
      service.finishOnboarding('owner', {
        homeLocalityId: 'plzen',
        interestIds: ['swimming', 'tennis', 'joga'],
        displayName: 'Hana Nová',
      }),
    ).resolves.toEqual({
      onboardingCompletedAt,
      localitySlug: 'brno',
      hasInterests: true,
      displayName: 'Jana Nová',
    });
  });

  it('marks a skip without rewriting any preferences or validating a catalog', async () => {
    repository.finishOnboarding.mockResolvedValue({
      ...saved,
      homeLocality: null,
      _count: { interests: 0 },
    });

    await expect(service.finishOnboarding('owner')).resolves.toEqual({
      onboardingCompletedAt,
      localitySlug: null,
      hasInterests: false,
      displayName: 'Jana Nová',
    });
    expect(repository.finishOnboarding).toHaveBeenCalledWith('owner', {});
    expect(repository.localityExists).not.toHaveBeenCalled();
    expect(repository.interestsExist).not.toHaveBeenCalled();
  });

  it('preserves earlier preferences and the finish time when a completed account skips', async () => {
    await expect(service.finishOnboarding('owner')).resolves.toEqual({
      onboardingCompletedAt,
      localitySlug: 'brno',
      hasInterests: true,
      displayName: 'Jana Nová',
    });
    expect(repository.finishOnboarding).toHaveBeenCalledWith('owner', {});
  });

  it.each([
    { label: 'missing account', value: null },
    {
      label: 'missing completion marker',
      value: { ...saved, onboardingCompletedAt: null },
    },
  ])(
    'denies a finish when the repository returns $label',
    async ({ value }) => {
      repository.finishOnboarding.mockResolvedValue(value);

      await expect(
        service.finishOnboarding('owner', localPreferences),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rejects an unknown locality without attempting to finish', async () => {
    repository.localityExists.mockResolvedValue(false);

    await expect(
      service.finishOnboarding('owner', localPreferences),
    ).rejects.toMatchObject({
      response: { code: 'UNKNOWN_LOCALITY' },
    });
    expect(repository.finishOnboarding).not.toHaveBeenCalled();
    expect(repository.interestsExist).not.toHaveBeenCalled();
  });

  it('rejects an unknown activity without replacing interests or completing onboarding', async () => {
    repository.interestsExist.mockResolvedValue(false);

    await expect(
      service.finishOnboarding('owner', localPreferences),
    ).rejects.toMatchObject({
      response: { code: 'UNKNOWN_ACTIVITY' },
    });
    expect(repository.finishOnboarding).not.toHaveBeenCalled();
  });
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

  // #64: the step shows who will see it, so the owner's choice is saved as made
  it('saves the optional bio with the visibility picked in the first step', async () => {
    const onboardingCompletedAt = new Date('2026-11-21T12:00:00Z');
    repository.finishOnboarding.mockResolvedValue({
      onboardingCompletedAt,
      name: 'Jana Nová',
      homeLocality: { slug: 'brno' },
      _count: { interests: 3 },
    });

    await service.finishOnboarding('owner', {
      homeLocalityId: 'brno',
      interestIds: ['walking', 'running', 'games'],
      bio: '  Hledám partu na výlety.  ',
      bioVisibility: 'organizers',
    });

    expect(repository.finishOnboarding).toHaveBeenCalledWith(
      'owner',
      expect.objectContaining({
        bio: 'Hledám partu na výlety.',
        bioVisibility: 'organizers',
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
