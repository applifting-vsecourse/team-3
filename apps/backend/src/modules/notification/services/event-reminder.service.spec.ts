import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { eventReminderKey } from '@/modules/notification/domain/event-reminder';
import { EventReminderRepository } from '@/modules/notification/repositories/event-reminder.repository';
import { reminderEvent } from '@/modules/notification/testing/event-reminder.fixture';
import { Config } from '@/shared/config/config.service';
import { Logger } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import { EventReminderService } from './event-reminder.service';

jest.mock('@/core/email/render', () => ({
  renderEmail: jest.fn().mockResolvedValue('<html>reminder</html>'),
}));

// 23 hours before the fixture's start: participants and the 24 h overview
const now = new Date('2026-11-27T18:00:00Z');
const aliceKey =
  'event-reminder:participant:event-1:alice:2026-11-28T17:00:00.000Z';
const config = {
  frontendUrl: 'https://hobbyhub.test',
  toppingEnabled: false,
} as Config;

const setup = (): {
  repository: ReturnType<typeof mockDeep<EventReminderRepository>>;
  email: ReturnType<typeof mockDeep<EmailService>>;
  service: EventReminderService;
} => {
  const repository = mockDeep<EventReminderRepository>();
  const email = mockDeep<EmailService>();
  const service = new EventReminderService(repository, email, config);
  repository.findUnavailableKeys.mockResolvedValue(new Set());
  repository.findEventIds.mockImplementation((_now, after) =>
    Promise.resolve(after ? [] : [{ id: 'event-1' }]),
  );
  repository.findEvent.mockImplementation(() =>
    Promise.resolve(reminderEvent()),
  );
  repository.claim.mockResolvedValue('owner');
  repository.markSent.mockResolvedValue(undefined);
  repository.release.mockResolvedValue(undefined);
  email.sendEmail.mockResolvedValue(undefined);
  return { repository, email, service };
};

const recipients = (
  email: ReturnType<typeof mockDeep<EmailService>>,
): string[] => email.sendEmail.mock.calls.map(([to]) => to);

describe('scheduled reminders before an event', () => {
  let warning: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    warning = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    jest.mocked(renderEmail).mockResolvedValue('<html>reminder</html>');
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sends the participants and the organizer their e-mail and records each', async () => {
    const { service, repository, email } = setup();
    await service.run();
    expect(email.sendEmail.mock.calls).toEqual([
      [
        'alice@example.test',
        'Zítra: Večer u deskovek',
        '<html>reminder</html>',
      ],
      ['bob@example.test', 'Zítra: Večer u deskovek', '<html>reminder</html>'],
      [
        'organizer@example.test',
        'Do minima chybí 2 lidé: Večer u deskovek',
        '<html>reminder</html>',
      ],
    ]);
    expect(repository.markSent).toHaveBeenCalledTimes(3);
    expect(repository.markSent).toHaveBeenCalledWith(aliceKey, 'owner', now);
  });

  it('skips keys already sent or out of attempts before claiming', async () => {
    const { service, repository, email } = setup();
    repository.findUnavailableKeys.mockResolvedValue(new Set([aliceKey]));
    await service.run();
    expect(repository.claim).toHaveBeenCalledTimes(2);
    expect(recipients(email)).toEqual([
      'bob@example.test',
      'organizer@example.test',
    ]);
  });

  it('sends each e-mail once, across runs, restarts and processes', async () => {
    const { service, repository, email } = setup();
    const sent = new Set<string>();
    repository.claim.mockImplementation((event, target) =>
      Promise.resolve(
        sent.has(eventReminderKey(event, target)) ? null : 'owner',
      ),
    );
    repository.markSent.mockImplementation((key) => {
      sent.add(key);
      return Promise.resolve();
    });
    const restarted = new EventReminderService(repository, email, config);
    await service.run();
    jest.setSystemTime(new Date(now.getTime() + 15 * 60_000));
    await service.run();
    await restarted.run();
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
    expect(sent.size).toBe(3);
  });

  it('a provider failure releases the claim, logs no address and retries next tick', async () => {
    const { service, repository, email } = setup();
    const sent = new Set<string>();
    repository.claim.mockImplementation((event, target) =>
      Promise.resolve(
        sent.has(eventReminderKey(event, target)) ? null : 'owner',
      ),
    );
    repository.markSent.mockImplementation((key) => {
      sent.add(key);
      return Promise.resolve();
    });
    email.sendEmail.mockRejectedValueOnce(
      new Error('secret alice@example.test token=secret'),
    );
    await service.run();
    expect(repository.release).toHaveBeenCalledWith(aliceKey, 'owner');
    expect(JSON.stringify(warning.mock.calls)).not.toMatch(/secret|@example/);
    jest.setSystemTime(new Date(now.getTime() + 15 * 60_000));
    await service.run();
    expect(recipients(email)).toEqual([
      'alice@example.test',
      'bob@example.test',
      'organizer@example.test',
      'alice@example.test',
    ]);
    expect(sent.size).toBe(3);
  });

  it('keeps the claim when the mail was accepted but recording it failed', async () => {
    const { service, repository, email } = setup();
    repository.markSent.mockRejectedValueOnce(new Error('DB unavailable'));
    await service.run();
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
    expect(repository.release).not.toHaveBeenCalled();
  });

  it('rechecks the event after claiming: a cancellation sends nothing', async () => {
    const { service, repository, email } = setup();
    repository.findEvent.mockResolvedValueOnce(reminderEvent());
    repository.findEvent.mockResolvedValue({
      ...reminderEvent(),
      status: 'cancelled',
    });
    await service.run();
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(repository.release).toHaveBeenCalledTimes(3);
  });

  it('no overview when the minimum was reached meanwhile', async () => {
    const { service, repository, email } = setup();
    repository.findEvent.mockResolvedValueOnce(reminderEvent());
    repository.findEvent.mockResolvedValue({
      ...reminderEvent(),
      minParticipants: 2,
    });
    await service.run();
    expect(recipients(email)).toEqual([
      'alice@example.test',
      'bob@example.test',
    ]);
  });

  it('a moved event does not get the reminder for its old date', async () => {
    const { service, repository, email } = setup();
    repository.findEvent.mockResolvedValueOnce(reminderEvent());
    repository.findEvent.mockResolvedValue({
      ...reminderEvent(),
      startsAt: new Date('2026-12-05T17:00:00Z'),
    });
    await service.run();
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('nothing outside the windows', async () => {
    const { service, email } = setup();
    jest.setSystemTime(new Date('2026-11-27T05:00:00Z'));
    await service.run();
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('a database failure is contained and the next tick retries', async () => {
    const { service, repository, email } = setup();
    repository.findEventIds.mockRejectedValueOnce(new Error('DB unavailable'));
    await expect(service.run()).resolves.toBeUndefined();
    await service.run();
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
  });

  it('the startup run cannot overlap another tick in the same process', async () => {
    const { service, repository, email } = setup();
    const run = service.run();
    service.onApplicationBootstrap();
    await service.run();
    await run;
    expect(repository.findEventIds).toHaveBeenCalledTimes(2); // one page + end
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
  });

  it('scans past a full page instead of dropping later events', async () => {
    const { service, repository } = setup();
    repository.findEventIds
      .mockResolvedValueOnce([{ id: 'first' }])
      .mockResolvedValueOnce([{ id: 'second' }])
      .mockResolvedValueOnce([]);
    repository.findEvent.mockResolvedValue(null);
    await service.run();
    expect(
      repository.findEventIds.mock.calls.map(([, after]) => after),
    ).toEqual([undefined, 'first', 'second']);
  });
});
