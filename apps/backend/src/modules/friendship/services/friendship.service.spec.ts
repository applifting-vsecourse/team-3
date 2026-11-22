import type { FriendshipRow } from '@/modules/friendship/domain/friendship';
import { FriendshipRepository } from '@/modules/friendship/repositories/friendship.repository';
import { NotificationService } from '@/modules/notification/services/notification.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mock, type MockProxy } from 'jest-mock-extended';
import { FriendshipService } from './friendship.service';

const A = 'user-a';
const B = 'user-b';
const now = new Date('2026-11-19T10:00:00.000Z');
const fromAtoB = (status: FriendshipRow['status']): FriendshipRow => ({
  requesterId: A,
  addresseeId: B,
  status,
});

const setup = (): {
  repository: MockProxy<FriendshipRepository>;
  notifications: MockProxy<NotificationService>;
  service: FriendshipService;
} => {
  const repository = mock<FriendshipRepository>();
  repository.isAvailable.mockResolvedValue(true);
  repository.findPair.mockResolvedValue(null);
  const notifications = mock<NotificationService>();
  return {
    repository,
    notifications,
    service: new FriendshipService(repository, notifications),
  };
};

const code = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => 'resolved',
    (error: { getResponse: () => { code: string } }) =>
      error.getResponse().code,
  );

describe('FriendshipService.request („Přidat do přátel“, #307)', () => {
  it('sends a new request', async () => {
    const { repository, service } = setup();
    repository.create.mockResolvedValue(true);

    await expect(service.request(A, B, now)).resolves.toBe('outgoing');
    expect(repository.create).toHaveBeenCalledWith(A, B);
  });

  it('accepts when the other already asks me', async () => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('pending'));
    repository.accept.mockResolvedValue(true);

    await expect(service.request(B, A, now)).resolves.toBe('friends');
    expect(repository.accept).toHaveBeenCalledWith(B, A, now);
  });

  it('the one who rejected asks themselves', async () => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('rejected'));
    repository.resend.mockResolvedValue(true);

    await expect(service.request(B, A, now)).resolves.toBe('outgoing');
    expect(repository.resend).toHaveBeenCalledWith(B, A, now);
  });

  it('both asking at once: the second one becomes an acceptance', async () => {
    const { repository, service } = setup();
    // nothing when B read, but A's request was saved before B's
    repository.findPair
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fromAtoB('pending'));
    repository.create.mockResolvedValue(false);
    repository.accept.mockResolvedValue(true);

    await expect(service.request(B, A, now)).resolves.toBe('friends');
  });

  it('a person who can’t be asked: 404 as a missing profile', async () => {
    const { repository, service } = setup();
    repository.isAvailable.mockResolvedValue(false);

    await expect(service.request(A, B, now)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(await code(service.request(A, B, now))).toBe('USER_NOT_FOUND');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('not myself', async () => {
    const { service } = setup();

    await expect(service.request(A, A, now)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    ['already friends', fromAtoB('accepted'), 'ALREADY_FRIENDS'],
    ['my request waits', fromAtoB('pending'), 'ALREADY_REQUESTED'],
    ['silently rejected', fromAtoB('rejected'), 'ALREADY_REQUESTED'],
  ] as const)('refuses when %s', async (_case, row, expected) => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(row);

    await expect(service.request(A, B, now)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(await code(service.request(A, B, now))).toBe(expected);
  });
});

describe('FriendshipService: upozornění (#86)', () => {
  it('a new request tells the one asked', async () => {
    const { repository, notifications, service } = setup();
    repository.create.mockResolvedValue(true);

    await service.request(A, B, now);

    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'friend-request',
      fromId: A,
      toId: B,
    });
  });

  it('accepting the other’s request tells the one who asked', async () => {
    const { repository, notifications, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('pending'));
    repository.accept.mockResolvedValue(true);

    await service.request(B, A, now);

    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'friend-accepted',
      fromId: B,
      toId: A,
    });
  });

  it('a write that didn’t happen tells nobody', async () => {
    const { repository, notifications, service } = setup();
    repository.create.mockResolvedValue(false);
    repository.findPair
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fromAtoB('accepted'))
      .mockResolvedValue(fromAtoB('accepted'));

    await service.request(B, A, now).catch(() => undefined);

    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('rejecting and removing stay silent', async () => {
    const { repository, notifications, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('pending'));
    repository.reject.mockResolvedValue(true);
    repository.remove.mockResolvedValue(true);

    await service.reject(B, A);
    await service.remove(A, B);

    expect(notifications.notify).not.toHaveBeenCalled();
  });
});

describe('FriendshipService.reject („Odmítnout“)', () => {
  it('quietly rejects the request waiting for me', async () => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('pending'));
    repository.reject.mockResolvedValue(true);

    await expect(service.reject(B, A)).resolves.toBe('none');
    expect(repository.reject).toHaveBeenCalledWith(B, A);
  });

  it('nothing to reject: my own request', async () => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('pending'));

    expect(await code(service.reject(A, B))).toBe('NO_REQUEST');
    expect(repository.reject).not.toHaveBeenCalled();
  });

  it('withdrawn meanwhile: nothing to reject any more', async () => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('pending'));
    repository.reject.mockResolvedValue(false);

    expect(await code(service.reject(B, A))).toBe('NO_REQUEST');
  });
});

describe('FriendshipService.remove („Zrušit žádost“, „Odebrat z přátel“)', () => {
  it.each([
    ['cancels my request', fromAtoB('pending'), A, B, 'cancel'],
    [
      'cancels it after a silent rejection',
      fromAtoB('rejected'),
      A,
      B,
      'cancel',
    ],
    ['unfriends', fromAtoB('accepted'), B, A, 'unfriend'],
  ] as const)('%s', async (_case, row, viewer, other, action) => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(row);
    repository.remove.mockResolvedValue(true);

    await expect(service.remove(viewer, other)).resolves.toBe('none');
    expect(repository.remove).toHaveBeenCalledWith(viewer, other, action);
  });

  it('a request waiting for me is rejected, not deleted', async () => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('pending'));

    await expect(service.remove(B, A)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(await code(service.remove(B, A))).toBe('NO_FRIENDSHIP');
    expect(repository.remove).not.toHaveBeenCalled();
  });
});

describe('FriendshipService.state and lists', () => {
  it('how I stand to the other, from the pair’s row', async () => {
    const { repository, service } = setup();
    repository.findPair.mockResolvedValue(fromAtoB('pending'));

    await expect(service.state(B, A)).resolves.toBe('incoming');
    await expect(service.state(A, A)).resolves.toBe('self');
  });

  it('lists my rows only', async () => {
    const { repository, service } = setup();
    repository.list.mockResolvedValue([]);

    await expect(service.lists(A)).resolves.toEqual({
      friends: [],
      incoming: [],
      outgoing: [],
    });
    expect(repository.list).toHaveBeenCalledWith(A);
  });
});
