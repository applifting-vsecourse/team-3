import { InviteService } from '@/modules/friendship/services/invite.service';
import type { Identity } from '@/shared/auth/domain/identity';
import { PublicReadThrottlerGuard } from '@/shared/rate-limit/rate-limit.guards';
import { GUARDS_METADATA, HEADERS_METADATA } from '@nestjs/common/constants';
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

  it('the link preview is HTML, cached for an hour, with the public-read limit (#475)', async () => {
    const invites = mock<InviteService>();
    invites.preview.mockResolvedValue('<!doctype html>');
    const handler = InvitesController.prototype.preview;

    await expect(new InvitesController(invites).preview(CODE)).resolves.toBe(
      '<!doctype html>',
    );
    expect(invites.preview).toHaveBeenCalledWith(CODE);
    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toEqual(
      expect.arrayContaining([
        { name: 'Content-Type', value: 'text/html; charset=utf-8' },
        { name: 'Cache-Control', value: 'public, max-age=3600' },
      ]),
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      PublicReadThrottlerGuard,
    ]);
  });
});
