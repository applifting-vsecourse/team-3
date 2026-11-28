import { InviteService } from '@/modules/friendship/services/invite.service';
import type { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { InvitesController } from './invites.controller';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest (as in notifications.controller.spec.ts).
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const CODE = 'q3Zr1hXkE0bLw9yT2vNcAa';
const user = { id: 'u2' } as Identity;

describe('InvitesController (#406)', () => {
  it('my link is always the session user’s', async () => {
    const invites = mock<InviteService>();
    invites.mine.mockResolvedValue({ code: CODE, url: 'u', joinedCount: 0 });

    await new InvitesController(invites).mine(user);

    expect(invites.mine).toHaveBeenCalledWith('u2');
  });

  it('answers the invite for the session user with the state afterwards', async () => {
    const invites = mock<InviteService>();
    invites.accept.mockResolvedValue('friends');

    await expect(
      new InvitesController(invites).accept(CODE, { befriend: true }, user),
    ).resolves.toEqual({ state: 'friends' });
    expect(invites.accept).toHaveBeenCalledWith('u2', CODE, true);
  });
});
