import { NotificationCenterService } from '@/modules/notification/services/notification-center.service';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { mock } from 'jest-mock-extended';
import { NotificationsController } from './notifications.controller';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest; the guard here needs neither.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const jana = { id: 'u2' } as Identity;

describe('NotificationsController (#86)', () => {
  it('every endpoint needs a session', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, NotificationsController),
    ).toEqual([AuthenticatedUserGuard]);
  });

  it('always asks for the session user’s own upozornění, never an id from the request', async () => {
    const centre = mock<NotificationCenterService>();
    centre.list.mockResolvedValue({ items: [], unreadCount: 0 });
    centre.unreadCount.mockResolvedValue(2);
    centre.markAllRead.mockResolvedValue(2);
    const controller = new NotificationsController(centre);

    await controller.list(jana);
    await expect(controller.unreadCount(jana)).resolves.toEqual({ count: 2 });
    await expect(controller.markAllRead(jana)).resolves.toEqual({ marked: 2 });
    await controller.markRead(jana, 'n1');

    expect(centre.list).toHaveBeenCalledWith('u2');
    expect(centre.unreadCount).toHaveBeenCalledWith('u2');
    expect(centre.markAllRead).toHaveBeenCalledWith('u2');
    expect(centre.markRead).toHaveBeenCalledWith('u2', 'n1');
  });
});
