import { NotificationCenterRepository } from '@/modules/notification/repositories/notification-center.repository';
import { NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import {
  NOTIFICATION_LIST_LIMIT,
  NotificationCenterService,
} from './notification-center.service';

const createdAt = new Date('2026-11-21T09:00:00.000Z');

const setup = (): {
  repository: MockProxy<NotificationCenterRepository>;
  service: NotificationCenterService;
} => {
  const repository = mock<NotificationCenterRepository>();
  return { repository, service: new NotificationCenterService(repository) };
};

describe('NotificationCenterService (#86)', () => {
  it('lists the newest 50 with where each leads, and all the unread', async () => {
    const { repository, service } = setup();
    repository.list.mockResolvedValue([
      {
        id: 'n2',
        type: 'request_received',
        targetId: 'e1',
        text: 'Jana se chce zúčastnit akce „Deskovky“.',
        createdAt,
        readAt: null,
      },
      {
        id: 'n1',
        type: 'friend_accepted',
        targetId: 'u7',
        text: 'Petr a ty jste teď přátelé.',
        createdAt,
        readAt: createdAt,
      },
    ]);
    repository.countUnread.mockResolvedValue(61);

    const centre = await service.list('u1');

    expect(repository.list).toHaveBeenCalledWith('u1', NOTIFICATION_LIST_LIMIT);
    expect(NOTIFICATION_LIST_LIMIT).toBe(50);
    expect(centre).toEqual({
      items: [
        {
          id: 'n2',
          type: 'request_received',
          text: 'Jana se chce zúčastnit akce „Deskovky“.',
          path: '/akce/e1/sprava',
          createdAt,
          readAt: null,
        },
        {
          id: 'n1',
          type: 'friend_accepted',
          text: 'Petr a ty jste teď přátelé.',
          path: '/uzivatele/u7',
          createdAt,
          readAt: createdAt,
        },
      ],
      unreadCount: 61,
    });
  });

  it('marks the user’s own as read', async () => {
    const { repository, service } = setup();
    repository.markRead.mockResolvedValue(true);
    const now = new Date('2026-11-21T10:00:00.000Z');

    await expect(service.markRead('u1', 'n1', now)).resolves.toBeUndefined();
    expect(repository.markRead).toHaveBeenCalledWith('u1', 'n1', now);
  });

  it('one that isn’t the user’s is 404, never „forbidden“: it doesn’t confirm it exists', async () => {
    const { repository, service } = setup();
    repository.markRead.mockResolvedValue(false);

    const error = await service.markRead('u2', 'n1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toMatchObject({
      code: 'NOTIFICATION_NOT_FOUND',
    });
  });

  it('marks all of the user’s as read', async () => {
    const { repository, service } = setup();
    repository.markAllRead.mockResolvedValue(3);

    await expect(service.markAllRead('u1')).resolves.toBe(3);
    expect(repository.markAllRead).toHaveBeenCalledWith('u1', expect.any(Date));
  });
});
