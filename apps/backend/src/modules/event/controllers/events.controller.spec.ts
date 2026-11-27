import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { PIPES_METADATA } from '@nestjs/common/constants';
import { CancelEventDto } from './dto/cancel-event.dto';
import { EventsController } from './events.controller';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

// review #380: the cancel reason is checked on the server like the
// superadmin's deactivation — trimmed, and blanks are 400
describe("EventsController: the cancel reason through the controller's pipe", () => {
  const pipe = (): PipeTransform => {
    const pipes = Reflect.getMetadata(PIPES_METADATA, EventsController) as
      PipeTransform[] | undefined;
    expect(pipes).toHaveLength(1);
    return pipes![0]!;
  };
  const body: ArgumentMetadata = { type: 'body', metatype: CancelEventDto };

  it('trims the reason', async () => {
    await expect(
      pipe().transform({ reason: '  Herna má zavřeno.  ' }, body),
    ).resolves.toEqual({ reason: 'Herna má zavřeno.' });
  });

  it.each(['', '   '])('a blank reason (%j) is 400', async (reason) => {
    await expect(
      Promise.resolve(pipe().transform({ reason }, body)),
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
