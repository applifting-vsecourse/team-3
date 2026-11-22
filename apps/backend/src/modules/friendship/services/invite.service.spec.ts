import type { FriendshipRow } from '@/modules/friendship/domain/friendship';
import { FriendshipRepository } from '@/modules/friendship/repositories/friendship.repository';
import { InviteRepository } from '@/modules/friendship/repositories/invite.repository';
import { NotificationService } from '@/modules/notification/services/notification.service';
import type { Config } from '@/shared/config/config.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { InviteService } from './invite.service';

const NEW = 'invitee';
const INVITER = 'inviter';
const CODE = 'q3Zr1hXkE0bLw9yT2vNcAa';
const now = new Date('2026-11-23T10:00:00.000Z');
const inviter = { id: INVITER, name: 'Tomáš Novák', interests: ['Volejbal'] };

const setup = (): {
  invites: MockProxy<InviteRepository>;
  friendships: MockProxy<FriendshipRepository>;
  notifications: MockProxy<NotificationService>;
  service: InviteService;
} => {
  const invites = mock<InviteRepository>();
  invites.findInviter.mockResolvedValue(inviter);
  invites.findInvitee.mockResolvedValue({ createdAt: now, invitedById: null });
  invites.countInvited.mockResolvedValue(0);
  invites.claim.mockResolvedValue(true);
  const friendships = mock<FriendshipRepository>();
  friendships.findPair.mockResolvedValue(null);
  const notifications = mock<NotificationService>();
  const service = new InviteService(invites, friendships, notifications, {
    frontendUrl: 'https://hobbyhub.test',
  } as Config);
  service.random = (size): Uint8Array => new Uint8Array(size).fill(1);
  return { invites, friendships, notifications, service };
};

const code = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => 'resolved',
    (error: { getResponse: () => { code: string } }) =>
      error.getResponse().code,
  );

describe('InviteService.mine („Pozvi kamaráda“, #406)', () => {
  it('returns the existing code as a link on the frontend, with the count', async () => {
    const { invites, service } = setup();
    invites.findCode.mockResolvedValue(CODE);
    invites.countInvited.mockResolvedValue(3);

    await expect(service.mine(NEW)).resolves.toEqual({
      code: CODE,
      url: `https://hobbyhub.test/pozvanka/${CODE}`,
      joinedCount: 3,
    });
    expect(invites.assignCode).not.toHaveBeenCalled();
  });

  it('draws a code on the first ask', async () => {
    const { invites, service } = setup();
    invites.findCode.mockResolvedValue(null);
    invites.assignCode.mockResolvedValue(true);

    const { code: drawn } = await service.mine(NEW);

    expect(drawn).toBe('AQEBAQEBAQEBAQEBAQEBAQ');
    expect(invites.assignCode).toHaveBeenCalledWith(NEW, drawn);
  });

  it('takes the code another tab drew meanwhile', async () => {
    const { invites, service } = setup();
    invites.findCode.mockResolvedValueOnce(null).mockResolvedValueOnce(CODE);
    invites.assignCode.mockResolvedValue(false);

    await expect(service.mine(NEW)).resolves.toMatchObject({ code: CODE });
  });
});

describe('InviteService.regenerate („Vytvořit nový odkaz“, #406)', () => {
  it('replaces the code', async () => {
    const { invites, service } = setup();
    invites.replaceCode.mockResolvedValue(true);

    await expect(service.regenerate(NEW)).resolves.toMatchObject({
      code: 'AQEBAQEBAQEBAQEBAQEBAQ',
    });
    expect(invites.replaceCode).toHaveBeenCalledWith(
      NEW,
      'AQEBAQEBAQEBAQEBAQEBAQ',
    );
  });
});

describe('InviteService.inviter (#406)', () => {
  it('shows the inviter’s public name and interests', async () => {
    const { service } = setup();
    await expect(service.inviter(CODE)).resolves.toEqual(inviter);
  });

  it('a malformed code is 404 without a query', async () => {
    const { invites, service } = setup();
    await expect(code(service.inviter('nope'))).resolves.toBe(
      'INVITE_NOT_FOUND',
    );
    expect(invites.findInviter).not.toHaveBeenCalled();
  });

  it('no such code, a blocked or deleted inviter: the same 404', async () => {
    const { invites, service } = setup();
    invites.findInviter.mockResolvedValue(null);
    await expect(code(service.inviter(CODE))).resolves.toBe('INVITE_NOT_FOUND');
  });
});

describe('InviteService.accept (the onboarding’s step, #406)', () => {
  it('a new account: friends at once, the inviter hears it joined', async () => {
    const { invites, friendships, notifications, service } = setup();
    friendships.createAccepted.mockResolvedValue(true);

    await expect(service.accept(NEW, CODE, true, now)).resolves.toBe('friends');
    expect(invites.claim).toHaveBeenCalledWith(NEW, INVITER, now);
    expect(friendships.createAccepted).toHaveBeenCalledWith(INVITER, NEW, now);
    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'friend-invite-joined',
      fromId: NEW,
      toId: INVITER,
      befriended: true,
    });
  });

  it('„Teď ne“: no friendship, the inviter still hears it joined', async () => {
    const { friendships, notifications, service } = setup();

    await expect(service.accept(NEW, CODE, false, now)).resolves.toBe('none');
    expect(friendships.createAccepted).not.toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'friend-invite-joined',
        befriended: false,
      }),
    );
  });

  it('a request between them becomes the friendship', async () => {
    const { friendships, service } = setup();
    const pending: FriendshipRow = {
      requesterId: NEW,
      addresseeId: INVITER,
      status: 'pending',
    };
    friendships.findPair.mockResolvedValue(pending);
    friendships.promote.mockResolvedValue(true);

    await expect(service.accept(NEW, CODE, true, now)).resolves.toBe('friends');
    expect(friendships.promote).toHaveBeenCalledWith(pending, now);
  });

  it('asked again after „Teď ne“: friends, told like an acceptance', async () => {
    const { invites, friendships, notifications, service } = setup();
    invites.findInvitee.mockResolvedValue({
      createdAt: now,
      invitedById: INVITER,
    });
    friendships.createAccepted.mockResolvedValue(true);

    await expect(service.accept(NEW, CODE, true, now)).resolves.toBe('friends');
    expect(invites.claim).not.toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'friend-accepted',
      fromId: NEW,
      toId: INVITER,
    });
  });

  it('an older account sends an ordinary request', async () => {
    const { invites, friendships, notifications, service } = setup();
    invites.findInvitee.mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      invitedById: null,
    });
    friendships.create.mockResolvedValue(true);

    await expect(service.accept(NEW, CODE, true, now)).resolves.toBe(
      'outgoing',
    );
    expect(invites.claim).not.toHaveBeenCalled();
    expect(friendships.create).toHaveBeenCalledWith(NEW, INVITER);
    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'friend-request',
      fromId: NEW,
      toId: INVITER,
    });
  });

  it('past 20 sign-ups a day the code is ignored: an ordinary request', async () => {
    const { invites, friendships, service } = setup();
    invites.countInvited.mockResolvedValue(20);
    friendships.create.mockResolvedValue(true);

    await expect(service.accept(NEW, CODE, true, now)).resolves.toBe(
      'outgoing',
    );
    expect(invites.claim).not.toHaveBeenCalled();
    expect(friendships.createAccepted).not.toHaveBeenCalled();
  });

  it('another tab claimed first: no second „joined“', async () => {
    const { invites, friendships, notifications, service } = setup();
    invites.claim.mockResolvedValue(false);
    friendships.create.mockResolvedValue(true);

    await service.accept(NEW, CODE, true, now);

    expect(notifications.notify).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'friend-invite-joined' }),
    );
  });

  it('already friends: nothing written, nobody told', async () => {
    const { invites, friendships, notifications, service } = setup();
    invites.findInvitee.mockResolvedValue({
      createdAt: now,
      invitedById: INVITER,
    });
    friendships.findPair.mockResolvedValue({
      requesterId: INVITER,
      addresseeId: NEW,
      status: 'accepted',
    });

    await expect(service.accept(NEW, CODE, true, now)).resolves.toBe('friends');
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('decides once more when the pair changed meanwhile', async () => {
    const { friendships, service } = setup();
    friendships.createAccepted.mockResolvedValue(false);
    friendships.findPair.mockResolvedValueOnce(null).mockResolvedValueOnce({
      requesterId: INVITER,
      addresseeId: NEW,
      status: 'pending',
    });
    friendships.promote.mockResolvedValue(true);

    await expect(service.accept(NEW, CODE, true, now)).resolves.toBe('friends');
    expect(friendships.promote).toHaveBeenCalled();
  });

  it('refuses one’s own invite', async () => {
    const { invites, service } = setup();
    await expect(code(service.accept(INVITER, CODE, true, now))).resolves.toBe(
      'SELF',
    );
    expect(invites.claim).not.toHaveBeenCalled();
  });

  it('an invalid code is 404', async () => {
    const { invites, service } = setup();
    invites.findInviter.mockResolvedValue(null);
    await expect(code(service.accept(NEW, CODE, true, now))).resolves.toBe(
      'INVITE_NOT_FOUND',
    );
  });
});
