import { EventModerationRepository } from '@/modules/admin/repositories/event-moderation.repository';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { EventModerationService } from './event-moderation.service';

const now = new Date('2026-11-20T10:00:00.000Z');

describe('EventModerationService (#308)', () => {
  const setup = (): {
    repository: ReturnType<typeof mock<EventModerationRepository>>;
    service: EventModerationService;
  } => {
    const repository = mock<EventModerationRepository>();
    return { repository, service: new EventModerationService(repository) };
  };

  it('deactivates with the reason and the admin', async () => {
    const { repository, service } = setup();
    repository.hideEvent.mockResolvedValue({ ok: true });

    await expect(
      service.hideEvent('e1', 'admin1', 'Podvod'),
    ).resolves.toBeUndefined();
    expect(repository.hideEvent).toHaveBeenCalledWith(
      'e1',
      'admin1',
      'Podvod',
      expect.any(Function),
    );
  });

  it('restores', async () => {
    const { repository, service } = setup();
    repository.unhideEvent.mockResolvedValue({ ok: true });

    await expect(
      service.unhideEvent('e1', 'admin1', now),
    ).resolves.toBeUndefined();
    expect(repository.unhideEvent).toHaveBeenCalledWith(
      'e1',
      'admin1',
      now,
      expect.any(Function),
    );
  });

  it('an unknown event is 404', async () => {
    const { repository, service } = setup();
    repository.hideEvent.mockResolvedValue(null);
    repository.unhideEvent.mockResolvedValue(null);

    await expect(service.hideEvent('x', 'admin1', 'Podvod')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.unhideEvent('x', 'admin1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it.each([
    ['EVENT_CANCELLED', 'Zrušenou akci deaktivovat nejde.'],
    ['EVENT_ALREADY_HIDDEN', 'Akce už je deaktivovaná.'],
  ] as const)('%s is 409 with its message', async (refusal, message) => {
    const { repository, service } = setup();
    repository.hideEvent.mockResolvedValue({ ok: false, refusal });

    const error = await service
      .hideEvent('e1', 'admin1', 'Podvod')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({
      code: refusal,
      message,
    });
  });

  it('restoring an event that is not deactivated is 409 EVENT_NOT_HIDDEN', async () => {
    const { repository, service } = setup();
    repository.unhideEvent.mockResolvedValue({
      ok: false,
      refusal: 'EVENT_NOT_HIDDEN',
    });

    await expect(service.unhideEvent('e1', 'admin1')).rejects.toThrow(
      ConflictException,
    );
  });

  describe('the reason, checked on the server (review #380)', () => {
    it('goes to the history trimmed', async () => {
      const { repository, service } = setup();
      repository.hideEvent.mockResolvedValue({ ok: true });

      await service.hideEvent('e1', 'admin1', '  Podvodná akce. \n');

      expect(repository.hideEvent).toHaveBeenCalledWith(
        'e1',
        'admin1',
        'Podvodná akce.',
        expect.any(Function),
      );
    });

    it.each(['', '   ', '\n\t '])(
      'blanks (%j) are 400 REASON_REQUIRED and nothing is written',
      async (reason) => {
        const { repository, service } = setup();

        const error = (await service
          .hideEvent('e1', 'admin1', reason)
          .catch((e: unknown) => e)) as BadRequestException;

        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toEqual({
          code: 'REASON_REQUIRED',
          message: 'Napiš důvod deaktivace.',
        });
        expect(repository.hideEvent).not.toHaveBeenCalled();
      },
    );

    it('over 500 characters after trimming is 400 REASON_TOO_LONG', async () => {
      const { repository, service } = setup();
      repository.hideEvent.mockResolvedValue({ ok: true });

      await service.hideEvent('e1', 'admin1', `  ${'x'.repeat(500)}  `);
      expect(repository.hideEvent).toHaveBeenCalledTimes(1);

      const error = (await service
        .hideEvent('e1', 'admin1', 'x'.repeat(501))
        .catch((e: unknown) => e)) as BadRequestException;
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toMatchObject({ code: 'REASON_TOO_LONG' });
      expect(repository.hideEvent).toHaveBeenCalledTimes(1);
    });
  });
});
