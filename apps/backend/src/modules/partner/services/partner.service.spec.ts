import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import {
  decodePartnerCursor,
  PARTNER_DAILY_REQUESTS,
  type PartnerCandidateRecord,
} from '@/modules/partner/domain/partner-suggestions';
import { PartnerRepository } from '@/modules/partner/repositories/partner.repository';
import { mock, type MockProxy } from 'jest-mock-extended';
import { PartnerService } from './partner.service';

const PRAHA = { lat: 50.0875, lng: 14.4214 };
const VOLLEYBALL = { id: 'a-volejbal', name: 'Volejbal', slug: 'volejbal' };
// 12:00 in Prague; the day started at 23:00 UTC the evening before
const now = new Date('2026-11-23T11:00:00.000Z');
const pragueMidnight = new Date('2026-11-22T23:00:00.000Z');

const setup = (): {
  repository: MockProxy<PartnerRepository>;
  friendships: MockProxy<FriendshipService>;
  service: PartnerService;
} => {
  const repository = mock<PartnerRepository>();
  repository.viewer.mockResolvedValue({
    home: PRAHA,
    interestIds: [VOLLEYBALL.id],
  });
  repository.requestsSentSince.mockResolvedValue(0);
  repository.candidates.mockResolvedValue([]);
  repository.isAvailable.mockResolvedValue(true);
  const friendships = mock<FriendshipService>();
  friendships.state.mockResolvedValue('none');
  friendships.request.mockResolvedValue('outgoing');
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
    expect(first.radiusKm).toBe(10);
    expect(first.missing).toEqual([]);
    expect(first.requestsLeft).toBe(PARTNER_DAILY_REQUESTS);
    expect(decodePartnerCursor(first.nextCursor ?? '')?.id).toBe('p19');
    const where = repository.candidates.mock.calls[0][1];
    expect(repository.candidates.mock.calls[0][0]).toBe('me');
    expect(where).toMatchObject({ id: { not: 'me' } });

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

  it('counts today’s requests from Prague midnight', async () => {
    const { repository, service } = setup();
    repository.requestsSentSince.mockResolvedValue(15);

    const page = await service.suggestions('me', 10, undefined, now);

    expect(page.requestsLeft).toBe(PARTNER_DAILY_REQUESTS - 15);
    expect(repository.requestsSentSince).toHaveBeenCalledWith(
      'me',
      pragueMidnight,
    );
  });

  it('without a home locality or interests says what the profile lacks and suggests nobody', async () => {
    const { repository, service } = setup();
    repository.viewer.mockResolvedValue({ home: null, interestIds: [] });

    const page = await service.suggestions('me', 25, undefined, now);

    expect(page).toMatchObject({
      items: [],
      nextCursor: null,
      missing: ['locality', 'interests'],
    });
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
  it('sends the friendship request (with its notification) and says what is left of today', async () => {
    const { repository, friendships, service } = setup();
    repository.requestsSentSince
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);

    await expect(service.request('me', 'other', now)).resolves.toEqual({
      state: 'outgoing',
      requestsLeft: PARTNER_DAILY_REQUESTS - 5,
    });
    expect(friendships.request).toHaveBeenCalledWith('me', 'other', now);
  });

  it('their request waiting for me is accepted: the match', async () => {
    const { friendships, service } = setup();
    friendships.state.mockResolvedValue('incoming');
    friendships.request.mockResolvedValue('friends');

    await expect(service.request('me', 'other', now)).resolves.toMatchObject({
      state: 'friends',
    });
  });

  it('refuses a new request once the day’s limit is used up', async () => {
    const { repository, friendships, service } = setup();
    repository.requestsSentSince.mockResolvedValue(PARTNER_DAILY_REQUESTS);

    await expect(code(service.request('me', 'other', now))).resolves.toBe(
      'PARTNER_DAILY_LIMIT',
    );
    expect(friendships.request).not.toHaveBeenCalled();
  });

  it('accepting is allowed also after the limit', async () => {
    const { repository, friendships, service } = setup();
    repository.requestsSentSince.mockResolvedValue(PARTNER_DAILY_REQUESTS);
    friendships.state.mockResolvedValue('incoming');
    friendships.request.mockResolvedValue('friends');

    await expect(service.request('me', 'other', now)).resolves.toEqual({
      state: 'friends',
      requestsLeft: 0,
    });
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
