import { EventModerationService } from '@/modules/admin/services/event-moderation.service';
import { Identity } from '@/shared/auth/domain/identity';
import { AdminGuard } from '@/shared/auth/guards/admin.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { mock } from 'jest-mock-extended';
import { AdminEventsController } from './admin-events.controller';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const admin = new Identity('admin1', 'admin@example.com', 'Správce', 'admin');

describe('AdminEventsController (#308)', () => {
  it('every endpoint is behind AdminGuard: a regular user gets 403', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminEventsController)).toEqual(
      [AdminGuard],
    );
  });

  it('deactivates as the signed-in admin, with the reason', async () => {
    const moderation = mock<EventModerationService>();
    const controller = new AdminEventsController(moderation);

    await controller.hide('e1', { reason: 'Podvod' }, admin);

    expect(moderation.hideEvent).toHaveBeenCalledWith('e1', 'admin1', 'Podvod');
  });

  it('restores as the signed-in admin', async () => {
    const moderation = mock<EventModerationService>();
    const controller = new AdminEventsController(moderation);

    await controller.unhide('e1', admin);

    expect(moderation.unhideEvent).toHaveBeenCalledWith('e1', 'admin1');
  });
});
