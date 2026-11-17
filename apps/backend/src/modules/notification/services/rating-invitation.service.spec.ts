import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { ratingInvitationKey } from '@/modules/notification/domain/rating-invitation';
import { RatingInvitationRepository } from '@/modules/notification/repositories/rating-invitation.repository';
import { invitationEvent } from '@/modules/notification/testing/rating-invitation.fixture';
import { Config } from '@/shared/config/config.service';
import { Logger } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import { RatingInvitationService } from './rating-invitation.service';

jest.mock('@/core/email/render', () => ({
  renderEmail: jest.fn().mockResolvedValue('<html>invitation</html>'),
}));
const now = new Date('2026-11-17T20:00:00Z');

const setup = (): {
  repository: ReturnType<typeof mockDeep<RatingInvitationRepository>>;
  email: ReturnType<typeof mockDeep<EmailService>>;
  service: RatingInvitationService;
} => {
  const repository = mockDeep<RatingInvitationRepository>();
  const email = mockDeep<EmailService>();
  const service = new RatingInvitationService(repository, email, {
    frontendUrl: 'https://hobbyhub.test',
  } as Config);
  repository.findEventIds.mockImplementation((_now, after) =>
    Promise.resolve(after ? [] : [{ id: 'event-1' }]),
  );
  repository.findEvent.mockImplementation(() =>
    Promise.resolve(invitationEvent()),
  );
  repository.claim.mockResolvedValue('owner');
  repository.markSent.mockResolvedValue(undefined);
  repository.release.mockResolvedValue(undefined);
  email.sendEmail.mockResolvedValue(undefined);
  return { repository, email, service };
};

describe('scheduled rating invitation delivery', () => {
  let warning: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    warning = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    jest.mocked(renderEmail).mockResolvedValue('<html>invitation</html>');
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sends both variants and records each accepted delivery', async () => {
    const { service, repository, email } = setup();
    await service.run();
    expect(email.sendEmail.mock.calls.map(([to]) => to)).toEqual([
      'alice@example.test',
      'bob@example.test',
      'organizer@example.test',
    ]);
    expect(repository.markSent).toHaveBeenCalledTimes(3);
    expect(repository.markSent).toHaveBeenCalledWith(
      'rating-invitation:organizer:event-1:organizer',
      'owner',
      now,
    );
  });

  it('successful recipients are not resent by a second run or another process', async () => {
    const { service, repository, email } = setup();
    const claimed = new Set<string>();
    const sent = new Set<string>();
    repository.claim.mockImplementation((id, target) => {
      const key = ratingInvitationKey(id, target);
      if (claimed.has(key) || sent.has(key)) return Promise.resolve(null);
      claimed.add(key);
      return Promise.resolve('owner');
    });
    repository.markSent.mockImplementation((key) => {
      sent.add(key);
      claimed.delete(key);
      return Promise.resolve();
    });
    const other = new RatingInvitationService(repository, email, {
      frontendUrl: 'https://hobbyhub.test',
    } as Config);
    await Promise.all([service.run(), other.run()]);
    await other.run();
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
    expect(sent.size).toBe(3);
  });

  it('a provider failure leaves no sent record, releases the claim and continues', async () => {
    const { service, repository, email } = setup();
    email.sendEmail.mockRejectedValueOnce(
      new Error('secret recipient@example.test token=secret'),
    );
    await service.run();
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
    expect(repository.markSent).toHaveBeenCalledTimes(2);
    expect(repository.release).toHaveBeenCalledWith(
      'rating-invitation:participant:event-1:alice',
      'owner',
    );
    expect(JSON.stringify(warning.mock.calls)).not.toMatch(/secret|recipient@/);
  });

  it('retains the lease when the provider accepted mail but recording success fails', async () => {
    const { service, repository, email } = setup();
    repository.markSent.mockRejectedValueOnce(new Error('DB unavailable'));
    await service.run();
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
    expect(repository.release).not.toHaveBeenCalled();
  });

  it('retries a failed recipient on the next tick while skipping confirmed deliveries', async () => {
    const { service, repository, email } = setup();
    const sent = new Set<string>();
    repository.claim.mockImplementation((id, target) =>
      Promise.resolve(
        sent.has(ratingInvitationKey(id, target)) ? null : 'owner',
      ),
    );
    repository.markSent.mockImplementation((key) => {
      sent.add(key);
      return Promise.resolve();
    });
    email.sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await service.run();
    jest.setSystemTime(new Date(now.getTime() + 15 * 60_000));
    await service.run();
    expect(email.sendEmail.mock.calls.map(([to]) => to)).toEqual([
      'alice@example.test',
      'bob@example.test',
      'organizer@example.test',
      'alice@example.test',
    ]);
    expect(sent.size).toBe(3);
  });

  it('rechecks cancellation after claiming, before sending the stale invitation', async () => {
    const { service, repository, email } = setup();
    repository.findEvent.mockResolvedValueOnce(invitationEvent());
    repository.findEvent.mockResolvedValue({
      ...invitationEvent(),
      status: 'cancelled',
    });
    await service.run();
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(repository.release).toHaveBeenCalledTimes(3);
  });

  it('rechecks blocked recipients and changed email addresses', async () => {
    const { service, repository, email } = setup();
    const changed = invitationEvent();
    changed.minParticipants = 1;
    changed.participations[0].user.blockedAt = now;
    changed.participations[1].user.email = 'new@example.test';
    repository.findEvent.mockResolvedValueOnce(invitationEvent());
    repository.findEvent.mockResolvedValue(changed);
    await service.run();
    expect(email.sendEmail.mock.calls.map(([to]) => to)).toEqual([
      'new@example.test',
      'organizer@example.test',
    ]);
    expect(repository.release).toHaveBeenCalledWith(
      'rating-invitation:participant:event-1:alice',
      'owner',
    );
  });

  it('a removed participant is not emailed from the original recipient list', async () => {
    const { service, repository, email } = setup();
    const changed = invitationEvent();
    changed.minParticipants = 1;
    changed.participations.shift();
    repository.findEvent.mockResolvedValueOnce(invitationEvent());
    repository.findEvent.mockResolvedValue(changed);
    await service.run();
    expect(email.sendEmail.mock.calls.map(([to]) => to)).toEqual([
      'bob@example.test',
      'organizer@example.test',
    ]);
  });

  it('a database failure is contained and the next scheduled tick can retry', async () => {
    const { service, repository, email } = setup();
    repository.findEventIds.mockRejectedValueOnce(new Error('DB unavailable'));
    await expect(service.run()).resolves.toBeUndefined();
    await service.run();
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
  });

  it('startup recovery cannot overlap another tick in the same process', async () => {
    const { service, repository, email } = setup();
    const run = service.run();
    service.onApplicationBootstrap();
    await service.run();
    await run;
    expect(repository.findEventIds).toHaveBeenCalledTimes(2); // one page + end
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
  });

  it('scans past a full page instead of dropping later events', async () => {
    const { service, repository, email } = setup();
    repository.findEventIds
      .mockResolvedValueOnce([{ id: 'first' }])
      .mockResolvedValueOnce([{ id: 'second' }])
      .mockResolvedValueOnce([]);
    repository.findEvent.mockResolvedValue(null);
    await service.run();
    expect(
      repository.findEventIds.mock.calls.map(([, after]) => after),
    ).toEqual([undefined, 'first', 'second']);
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
});
