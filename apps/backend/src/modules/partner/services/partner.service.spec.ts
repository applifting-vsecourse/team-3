import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import {
  decodePartnerCursor,
  type PartnerCandidateRecord,
} from '@/modules/partner/domain/partner-suggestions';
import {
  PartnerRepository,
  type PartnerViewerRecord,
} from '@/modules/partner/repositories/partner.repository';
import { HttpException, HttpStatus } from '@nestjs/common';
import { mock, type MockProxy } from 'jest-mock-extended';
import { PartnerService } from './partner.service';

const PRAHA = { lat: 50.0875, lng: 14.4214 };
const VOLLEYBALL = { id: 'a-volejbal', name: 'Volejbal', slug: 'volejbal' };
const now = new Date('2026-11-23T11:00:00.000Z');

const viewer = (
  changes: Partial<PartnerViewerRecord> = {},
): PartnerViewerRecord => ({
  home: PRAHA,
  interestIds: [VOLLEYBALL.id],
  hasOnboarded: true,
  isDiscoverable: true,
  ...changes,
});

const setup = (): {
  repository: MockProxy<PartnerRepository>;
  friendships: MockProxy<FriendshipService>;
  service: PartnerService;
} => {
  const repository = mock<PartnerRepository>();
  repository.viewer.mockResolvedValue(viewer());
  repository.candidates.mockResolvedValue([]);
  repository.isAvailable.mockResolvedValue(true);
  repository.homeState.mockResolvedValue({
    visitedAt: null,
    hiddenUntil: null,
    friendsCount: 0,
  });
  const friendships = mock<FriendshipService>();
  friendships.request.mockResolvedValue('outgoing');
  friendships.requestsLeft.mockResolvedValue(20);
  return {
    repository,
    friendships,
    service: new PartnerService(repository, friendships),
  };
};

const code = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => 'resolved',
    (error: { getResponse: () => { code: string } }) =>
      error.getResponse().code,
  );

const candidate = (id: string): PartnerCandidateRecord => ({
  id,
  name: id,
  homeLocality: PRAHA,
  interests: [{ activity: VOLLEYBALL }],
  sentFriendRequests: [],
});

describe('PartnerService.suggestions (#84)', () => {
  it('ranks the candidates of the radius and pages them', async () => {
    const { repository, service } = setup();
    repository.candidates.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) =>
        candidate(`p${String(index).padStart(2, '0')}`),
      ),
    );

    const first = await service.suggestions('me', 10, undefined, now);

    expect(first.items).toHaveLength(20);
    expect(first).toMatchObject({
      radiusKm: 10,
      missing: [],
      hidden: false,
      requestsLeft: 20,
    });
    expect(decodePartnerCursor(first.nextCursor ?? '')?.id).toBe('p19');
    expect(repository.candidates.mock.calls[0][0]).toBe('me');
    expect(repository.candidates.mock.calls[0][1]).toMatchObject({
      id: { not: 'me' },
    });

    const second = await service.suggestions(
      'me',
      10,
      first.nextCursor ?? undefined,
      now,
    );
    expect(second.items.map(({ id }) => id)).toEqual([
      'p20',
      'p21',
      'p22',
      'p23',
      'p24',
    ]);
    expect(second.nextCursor).toBeNull();
  });

  it('says what is left of today’s requests, from the friendship module', async () => {
    const { friendships, service } = setup();
    friendships.requestsLeft.mockResolvedValue(5);

    const page = await service.suggestions('me', 10, undefined, now);

    expect(page.requestsLeft).toBe(5);
    expect(friendships.requestsLeft).toHaveBeenCalledWith('me', now);
  });

  it('without a finished onboarding, a home locality or interests says what is missing and suggests nobody', async () => {
    const { repository, service } = setup();
    repository.viewer.mockResolvedValue(
      viewer({ hasOnboarded: false, home: null, interestIds: [] }),
    );

    const page = await service.suggestions('me', 25, undefined, now);

    expect(page).toMatchObject({
      items: [],
      nextCursor: null,
      missing: ['onboarding', 'locality', 'interests'],
    });
    expect(repository.candidates).not.toHaveBeenCalled();
  });

  it('hidden from the deck: sees nobody either, as Bumble’s Snooze', async () => {
    const { repository, service } = setup();
    repository.viewer.mockResolvedValue(viewer({ isDiscoverable: false }));

    const page = await service.suggestions('me', 25, undefined, now);

    expect(page).toMatchObject({ items: [], hidden: true, missing: [] });
    expect(repository.candidates).not.toHaveBeenCalled();
  });

  it('refuses a cursor it did not give out', async () => {
    const { repository, service } = setup();

    await expect(
      code(service.suggestions('me', 25, 'nonsense', now)),
    ).resolves.toBe('INVALID_CURSOR');
    expect(repository.viewer).not.toHaveBeenCalled();
  });

  it('a gone account gets USER_NOT_FOUND', async () => {
    const { repository, service } = setup();
    repository.viewer.mockResolvedValue(null);

    await expect(
      code(service.suggestions('me', 25, undefined, now)),
    ).resolves.toBe('USER_NOT_FOUND');
  });
});

describe('PartnerService.request („Přidat“, #84)', () => {
  it('is the friendship request (with its notification) and says what is left of today', async () => {
    const { friendships, service } = setup();
    friendships.requestsLeft.mockResolvedValue(15);

    await expect(service.request('me', 'other', now)).resolves.toEqual({
      state: 'outgoing',
      requestsLeft: 15,
    });
    expect(friendships.request).toHaveBeenCalledWith('me', 'other', now);
  });

  it('their request waiting for me is accepted: the match', async () => {
    const { friendships, service } = setup();
    friendships.request.mockResolvedValue('friends');

    await expect(service.request('me', 'other', now)).resolves.toMatchObject({
      state: 'friends',
    });
  });

  it('the friendship module’s daily limit passes through as it is', async () => {
    const { friendships, service } = setup();
    friendships.request.mockRejectedValue(
      new HttpException(
        { code: 'FRIEND_REQUEST_DAILY_LIMIT' },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    await expect(code(service.request('me', 'other', now))).resolves.toBe(
      'FRIEND_REQUEST_DAILY_LIMIT',
    );
  });
});

describe('PartnerService.skip and unskip („Teď ne“, „Vrátit“, #84)', () => {
  it('remembers the skip', async () => {
    const { repository, service } = setup();

    await service.skip('me', 'other', now);

    expect(repository.skip).toHaveBeenCalledWith('me', 'other', now);
  });

  it('not oneself', async () => {
    const { repository, service } = setup();

    await expect(code(service.skip('me', 'me', now))).resolves.toBe('SELF');
    await expect(code(service.unskip('me', 'me'))).resolves.toBe('SELF');
    expect(repository.skip).not.toHaveBeenCalled();
    expect(repository.unskip).not.toHaveBeenCalled();
  });

  it('not a blocked, deleted or unknown account', async () => {
    const { repository, service } = setup();
    repository.isAvailable.mockResolvedValue(false);

    await expect(code(service.skip('me', 'gone', now))).resolves.toBe(
      'USER_NOT_FOUND',
    );
    expect(repository.skip).not.toHaveBeenCalled();
  });

  it('Vrátit forgets the skip', async () => {
    const { repository, service } = setup();

    await service.unskip('me', 'other');

    expect(repository.unskip).toHaveBeenCalledWith('me', 'other');
  });
});

describe('PartnerService home preview („Parťáci v okolí“, #474)', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('shows the first three of the 10 km deck', async () => {
    const { repository, service } = setup();
    repository.candidates.mockResolvedValue(
      ['p1', 'p2', 'p3', 'p4'].map(candidate),
    );

    const preview = await service.homePreview('me', now);

    expect(preview.isShown).toBe(true);
    expect(preview.items.map(({ id }) => id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('with two people nearby it isn’t shown', async () => {
    const { repository, service } = setup();
    repository.candidates.mockResolvedValue(['p1', 'p2'].map(candidate));

    await expect(service.homePreview('me', now)).resolves.toEqual({
      isShown: false,
      items: [],
    });
  });

  it('a profile without a locality, or hidden from the deck, gets no block', async () => {
    const { repository, service } = setup();
    repository.viewer.mockResolvedValue(viewer({ home: null }));
    await expect(service.homePreview('me', now)).resolves.toMatchObject({
      isShown: false,
    });
    repository.viewer.mockResolvedValue(viewer({ isDiscoverable: false }));
    await expect(service.homePreview('me', now)).resolves.toMatchObject({
      isShown: false,
    });
  });

  it('within 7 days of a visit, under Skrýt or with 10 friends: not shown and no deck is built', async () => {
    const { repository, service } = setup();
    for (const state of [
      {
        visitedAt: new Date(now.getTime() - 3 * DAY),
        hiddenUntil: null,
        friendsCount: 0,
      },
      {
        visitedAt: null,
        hiddenUntil: new Date(now.getTime() + DAY),
        friendsCount: 0,
      },
      { visitedAt: null, hiddenUntil: null, friendsCount: 10 },
    ]) {
      repository.homeState.mockResolvedValue(state);
      await expect(service.homePreview('me', now)).resolves.toEqual({
        isShown: false,
        items: [],
      });
    }
    expect(repository.viewer).not.toHaveBeenCalled();
  });

  it('a gone account gets USER_NOT_FOUND', async () => {
    const { repository, service } = setup();
    repository.homeState.mockResolvedValue(null);

    await expect(code(service.homePreview('me', now))).resolves.toBe(
      'USER_NOT_FOUND',
    );
  });

  it('a visit is stored now, Skrýt for 30 days', async () => {
    const { repository, service } = setup();

    await service.recordVisit('me', now);
    await service.hideHome('me', now);

    expect(repository.recordVisit).toHaveBeenCalledWith('me', now);
    expect(repository.hideHome).toHaveBeenCalledWith(
      'me',
      new Date(now.getTime() + 30 * DAY),
    );
  });
});
