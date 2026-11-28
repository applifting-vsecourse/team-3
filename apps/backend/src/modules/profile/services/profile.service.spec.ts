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
  blockedAt: null,
  deletedAt: null,
  partnerDiscoverable: true,
  homeLocalityChangeDay: null,
  homeLocalityChangeCount: 0,
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

  it('saves the initial locality and interests in one request', async () => {
    await expect(
      service.finishOnboarding('owner', localPreferences),
    ).resolves.toEqual({
      onboardingCompletedAt,
      localitySlug: 'brno',
      hasInterests: true,
    });
    expect(repository.finishOnboarding).toHaveBeenCalledTimes(1);
    expect(repository.finishOnboarding).toHaveBeenCalledWith(
      'owner',
      nestedPreferences,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns the previously saved values if the write had already completed', async () => {
    await expect(
      service.finishOnboarding('owner', {
        homeLocalityId: 'plzen',
        interestIds: ['swimming', 'tennis', 'joga'],
      }),
    ).resolves.toEqual({
      onboardingCompletedAt,
      localitySlug: 'brno',
      hasInterests: true,
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
  it('switches „Ukazovat mě v Najdi parťáka“ alone (#84)', async () => {
    await service.update('owner', { partnerDiscoverable: false });
    expect(repository.save).toHaveBeenCalledWith('owner', {
      partnerDiscoverable: false,
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
  it('counts a new home in the Prague day (#84)', async () => {
    const now = new Date('2026-11-23T10:00:00.000Z');
    await service.update('owner', { homeLocalityId: 'brno' }, now);
    expect(repository.save).toHaveBeenCalledWith(
      'owner',
      expect.objectContaining({
        homeLocality: { connect: { id: 'brno' } },
        homeLocalityChangeDay: '2026-11-23',
        homeLocalityChangeCount: 1,
      }),
      // written only while the counter is still the one read (two requests at once)
      { homeLocalityChangeDay: null, homeLocalityChangeCount: 0 },
    );
  });
  it('a change of home that lost the race to another one is refused, not counted past the limit (#84)', async () => {
    repository.save.mockResolvedValue(null);
    const error = await service
      .update('owner', { homeLocalityId: 'brno' })
      .catch((caught: unknown) => caught);
    expect((error as { getStatus: () => number }).getStatus()).toBe(409);
  });
  it('refuses a fourth new home the same day, so the distance bands can’t be probed (#84)', async () => {
    const now = new Date('2026-11-23T10:00:00.000Z');
    repository.get.mockResolvedValue({
      ...row(),
      homeLocalityChangeDay: '2026-11-23',
      homeLocalityChangeCount: 3,
    });
    const error = await service
      .update('owner', { homeLocalityId: 'brno' }, now)
      .catch((caught: unknown) => caught);
    expect((error as { getStatus: () => number }).getStatus()).toBe(429);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('the same home again, or other fields, isn’t a change (#84)', async () => {
    const now = new Date('2026-11-23T10:00:00.000Z');
    repository.get.mockResolvedValue({
      ...row(),
      homeLocality: {
        id: 'brno',
        name: 'Brno',
        slug: 'brno',
        parentId: null,
        lat: 49.2,
        lng: 16.6,
      },
      homeLocalityChangeDay: '2026-11-23',
      homeLocalityChangeCount: 3,
    });
    await service.update(
      'owner',
      { homeLocalityId: 'brno', name: 'Jana' },
      now,
    );
    expect(repository.save).toHaveBeenCalledWith(
      'owner',
      expect.not.objectContaining({
        homeLocalityChangeCount: expect.anything(),
      }),
    );
  });
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
