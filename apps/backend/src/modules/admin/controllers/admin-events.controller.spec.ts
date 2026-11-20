import { EventModerationService } from '@/modules/admin/services/event-moderation.service';
import { Identity } from '@/shared/auth/domain/identity';
import { AdminGuard } from '@/shared/auth/guards/admin.guard';
import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { GUARDS_METADATA, PIPES_METADATA } from '@nestjs/common/constants';
import { mock } from 'jest-mock-extended';
import { AdminEventsController } from './admin-events.controller';
import { HideEventDto } from './dto/hide-event.dto';

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

  describe("the body, through the controller's own pipe (review #380)", () => {
    const pipe = (): PipeTransform => {
      const pipes = Reflect.getMetadata(
        PIPES_METADATA,
        AdminEventsController,
      ) as PipeTransform[] | undefined;
      expect(pipes).toHaveLength(1);
      return pipes![0]!;
    };
    const body: ArgumentMetadata = { type: 'body', metatype: HideEventDto };

    it('trims the reason', async () => {
      await expect(
        pipe().transform({ reason: '  Podvod  ' }, body),
      ).resolves.toEqual({ reason: 'Podvod' });
    });

    it.each(['', '   '])('a blank reason (%j) is 400', async (reason) => {
      const error = (await Promise.resolve(
        pipe().transform({ reason }, body),
      ).catch((e: unknown) => e)) as BadRequestException;

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toMatchObject({
        message: expect.arrayContaining(['Napiš důvod deaktivace.']),
      });
    });

    it('a missing reason and unknown fields are 400', async () => {
      await expect(
        Promise.resolve(pipe().transform({}, body)),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        Promise.resolve(pipe().transform({ reason: 'Podvod', extra: 1 }, body)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('500 characters count after the trim', async () => {
      await expect(
        pipe().transform({ reason: ` ${'x'.repeat(500)} ` }, body),
      ).resolves.toEqual({ reason: 'x'.repeat(500) });
      await expect(
        Promise.resolve(pipe().transform({ reason: 'x'.repeat(501) }, body)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
