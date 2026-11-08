import { EmailService } from '@/core/email/interfaces/email-service.interface';
import {
  Notification,
  NotifiedEvent,
  Recipient,
} from '@/modules/notification/domain/notification';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Config } from '@/shared/config/config.service';
import { Logger } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { NotificationService } from './notification.service';

// react-email's render needs react-dom loaded dynamically, which jest can't;
// the props are what the e-mail says, so the „html“ here is the props as JSON.
jest.mock('@/core/email/render', () => ({
  renderEmail: jest.fn(async (_component: unknown, props: unknown) =>
    JSON.stringify(props),
  ),
}));

const frontendUrl = 'https://hobbyhub.example';

const event: NotifiedEvent = {
  id: 'e1',
  title: 'Deskovky ve středu',
  startsAt: new Date('2026-11-11T17:00:00.000Z'),
  endsAt: null,
  address: 'Herna Karlín, Křižíkova 52, Praha 8',
  cancelReason: null,
  approvedCount: 3,
  maxParticipants: 6,
  organizerId: 'u1',
};

const organizer: Recipient = {
  id: 'u1',
  name: 'Petra',
  email: 'petra@example.com',
};
const jana: Recipient = { id: 'u2', name: 'Jana', email: 'jana@example.com' };
const tomas: Recipient = {
  id: 'u3',
  name: 'Tomáš',
  email: 'tomas@example.com',
};

const setup = (): {
  repository: MockProxy<NotificationRepository>;
  email: MockProxy<EmailService>;
  service: NotificationService;
} => {
  const repository = mock<NotificationRepository>();
  repository.findEvent.mockResolvedValue(event);
  repository.findRecipients.mockResolvedValue([]);
  repository.findAudience.mockResolvedValue([]);
  repository.findPersonName.mockResolvedValue('Jana Nováková');
  const email = mock<EmailService>();
  email.sendEmail.mockResolvedValue(undefined);
  const service = new NotificationService(repository, email, {
    frontendUrl,
  } as Config);
  return { repository, email, service };
};

const sentTo = (email: MockProxy<EmailService>): string[] =>
  email.sendEmail.mock.calls.map(([to]) => to);

describe('NotificationService.deliver', () => {
  describe('who gets what (B-041)', () => {
    it('an approved request: the applicants, with a link to the event', async () => {
      const { repository, email, service } = setup();
      repository.findRecipients.mockResolvedValue([jana, tomas]);

      await service.deliver({
        type: 'request-decided',
        eventId: 'e1',
        userIds: ['u2', 'u3'],
        outcome: 'approved',
      });

      expect(repository.findRecipients).toHaveBeenCalledWith(['u2', 'u3']);
      expect(sentTo(email)).toEqual([jana.email, tomas.email]);
      const [, subject, html] = email.sendEmail.mock.calls[0]!;
      expect(subject).toBe('Máš místo na akci: Deskovky ve středu');
      expect(html).toContain(`${frontendUrl}/akce/e1`);
    });

    it('a rejected request: the applicants too, with the other subject', async () => {
      const { repository, email, service } = setup();
      repository.findRecipients.mockResolvedValue([jana]);

      await service.deliver({
        type: 'request-decided',
        eventId: 'e1',
        userIds: ['u2'],
        outcome: 'rejected',
      });

      expect(sentTo(email)).toEqual([jana.email]);
      const [, subject, html] = email.sendEmail.mock.calls[0]!;
      expect(subject).toBe('Žádost o účast nebyla přijata: Deskovky ve středu');
      expect(html).toContain(`${frontendUrl}/akce/e1`);
    });

    it('a change of time or place: everyone with a place or a request, but not the organizer', async () => {
      const { repository, email, service } = setup();
      repository.findAudience.mockResolvedValue([jana, tomas]);

      await service.deliver({
        type: 'event-changed',
        eventId: 'e1',
        change: { when: null, place: { from: 'Herna', to: 'Louvre' } },
      });

      expect(repository.findAudience).toHaveBeenCalledWith('e1', 'u1');
      expect(sentTo(email)).toEqual([jana.email, tomas.email]);
      const [, subject, html] = email.sendEmail.mock.calls[0]!;
      expect(subject).toBe('Změna u akce: Deskovky ve středu');
      expect(html).toContain(`${frontendUrl}/akce/e1`);
      expect(html).toContain('Louvre');
    });

    it('a cancellation: the same people, with the reason', async () => {
      const { repository, email, service } = setup();
      repository.findEvent.mockResolvedValue({
        ...event,
        cancelReason: 'Herna má zavřeno.',
      });
      repository.findAudience.mockResolvedValue([jana, tomas]);

      await service.deliver({ type: 'event-cancelled', eventId: 'e1' });

      expect(repository.findAudience).toHaveBeenCalledWith('e1', 'u1');
      expect(sentTo(email)).toEqual([jana.email, tomas.email]);
      const [, subject, html] = email.sendEmail.mock.calls[0]!;
      expect(subject).toBe('Akce zrušena: Deskovky ve středu');
      expect(html).toContain('Herna má zavřeno.');
      expect(html).toContain(`${frontendUrl}/akce/e1`);
    });

    it('a new request: only the organizer, with the applicant and what they wrote', async () => {
      const { repository, email, service } = setup();
      repository.findRecipients.mockResolvedValue([organizer]);

      await service.deliver({
        type: 'request-received',
        eventId: 'e1',
        applicantId: 'u2',
        message: 'Hraju rád a pozvu kamaráda.',
      });

      expect(repository.findRecipients).toHaveBeenCalledWith(['u1']);
      expect(repository.findPersonName).toHaveBeenCalledWith('u2');
      expect(sentTo(email)).toEqual([organizer.email]);
      const [, subject, html] = email.sendEmail.mock.calls[0]!;
      expect(subject).toBe('Nová žádost o účast: Deskovky ve středu');
      expect(html).toContain('Jana Nováková');
      expect(html).toContain('Hraju rád a pozvu kamaráda.');
      expect(html).toContain(`${frontendUrl}/akce/e1/sprava`);
    });

    it('a participant leaving: only the organizer, with who is still in', async () => {
      const { repository, email, service } = setup();
      repository.findRecipients.mockResolvedValue([organizer]);

      await service.deliver({
        type: 'participant-left',
        eventId: 'e1',
        participantId: 'u2',
      });

      expect(sentTo(email)).toEqual([organizer.email]);
      const [, subject, html] = email.sendEmail.mock.calls[0]!;
      expect(subject).toBe('Odhlášení z akce: Deskovky ve středu');
      expect(html).toContain('Jana Nováková');
      expect(html).toContain('3 z 6');
      expect(html).toContain(`${frontendUrl}/akce/e1/sprava`);
    });

    it('the organizer hears nothing of what they did themselves', async () => {
      const { repository, email, service } = setup();

      await service.deliver({
        type: 'participant-left',
        eventId: 'e1',
        participantId: 'u1',
      });

      expect(repository.findRecipients).not.toHaveBeenCalled();
      expect(email.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('a group announcement (#194)', () => {
    const announcement = {
      id: 'an1',
      subject: 'Přes svátky se nehraje',
      body: 'Pauza do 6. 1.',
      senderId: 'u1',
      group: { id: 'g1', name: 'Florbal Podvinný mlýn' },
    };

    it('goes to the active members but not to the admin who wrote it, with a link to the group', async () => {
      const { repository, email, service } = setup();
      repository.findAnnouncement.mockResolvedValue(announcement);
      repository.findActiveMembers.mockResolvedValue([jana, tomas]);

      await service.deliver({
        type: 'group-announcement',
        announcementId: 'an1',
      });

      expect(repository.findActiveMembers).toHaveBeenCalledWith('g1', 'u1');
      expect(repository.findEvent).not.toHaveBeenCalled();
      expect(sentTo(email)).toEqual([jana.email, tomas.email]);
      const [, subject, html] = email.sendEmail.mock.calls[0];
      expect(subject).toBe('Florbal Podvinný mlýn: Přes svátky se nehraje');
      expect(html).toContain(`${frontendUrl}/skupiny/g1`);
      expect(html).toContain('Pauza do 6. 1.');
    });

    it('one that is gone sends nothing', async () => {
      const { repository, email, service } = setup();
      repository.findAnnouncement.mockResolvedValue(null);

      await service.deliver({
        type: 'group-announcement',
        announcementId: 'an1',
      });

      expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('a group with nobody else in it sends nothing', async () => {
      const { repository, email, service } = setup();
      repository.findAnnouncement.mockResolvedValue(announcement);
      repository.findActiveMembers.mockResolvedValue([]);

      await service.deliver({
        type: 'group-announcement',
        announcementId: 'an1',
      });

      expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('a failed lookup is logged with the announcement id, never thrown', async () => {
      const { repository, service } = setup();
      const error = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      repository.findAnnouncement.mockRejectedValue(new Error('db down'));

      await expect(
        service.deliver({ type: 'group-announcement', announcementId: 'an1' }),
      ).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('oznámení an1'),
      );
      error.mockRestore();
    });
  });

  describe('when there is nothing to send', () => {
    it('an event that is gone sends nothing', async () => {
      const { repository, email, service } = setup();
      repository.findEvent.mockResolvedValue(null);

      await service.deliver({ type: 'event-cancelled', eventId: 'e1' });

      expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('nobody to tell sends nothing', async () => {
      const { email, service } = setup();

      await service.deliver({ type: 'event-cancelled', eventId: 'e1' });

      expect(email.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('a failure never breaks anything (B-040)', () => {
    let warn: jest.SpyInstance;
    let error: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });
    afterEach(() => jest.restoreAllMocks());

    it('a mail that fails is skipped and the others still go out', async () => {
      const { repository, email, service } = setup();
      repository.findAudience.mockResolvedValue([jana, tomas]);
      email.sendEmail
        .mockRejectedValueOnce(
          Object.assign(new Error('550 no such user jana@example.com'), {
            code: 'EENVELOPE',
          }),
        )
        .mockResolvedValue(undefined);

      await expect(
        service.deliver({ type: 'event-cancelled', eventId: 'e1' }),
      ).resolves.toBeUndefined();

      expect(sentTo(email)).toEqual([jana.email, tomas.email]);
      expect(warn).toHaveBeenCalledTimes(1);
      // who it was and what kind of failure, never the address an SMTP error quotes
      const logged = String(warn.mock.calls[0]![0]);
      expect(logged).toContain('u2');
      expect(logged).toContain('EENVELOPE');
      expect(logged).not.toContain('jana@example.com');
    });

    it('never logs arbitrary error names, unknown codes or provider messages', async () => {
      const { repository, email, service } = setup();
      repository.findAudience.mockResolvedValue([jana]);
      email.sendEmail.mockRejectedValue(
        Object.assign(new Error('test-private-provider-message'), {
          name: 'private@example.com',
          code: 'TEST_PRIVATE_TOKEN',
        }),
      );
      await service.deliver({ type: 'event-cancelled', eventId: 'e1' });
      expect(warn).toHaveBeenCalledTimes(1);
      const logged = String(warn.mock.calls[0]![0]);
      expect(logged).toContain('Error');
      expect(logged).not.toMatch(
        /private@example|TEST_PRIVATE_TOKEN|test-private-provider-message/,
      );
    });

    it('a lookup that fails is logged, not thrown', async () => {
      const { repository, email, service } = setup();
      repository.findEvent.mockRejectedValue(new Error('db down'));

      await expect(
        service.deliver({ type: 'event-cancelled', eventId: 'e1' }),
      ).resolves.toBeUndefined();

      expect(email.sendEmail).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(1);
    });
  });
});

describe('NotificationService.notify', () => {
  const flush = (): Promise<void> =>
    new Promise((resolve) => setImmediate(resolve));
  const cancelled: Notification = { type: 'event-cancelled', eventId: 'e1' };

  it('returns at once; the mails go out afterwards', async () => {
    const { repository, email, service } = setup();
    repository.findAudience.mockResolvedValue([jana]);

    expect(service.notify(cancelled)).toBeUndefined();
    expect(email.sendEmail).not.toHaveBeenCalled();

    await flush();
    await flush();
    expect(sentTo(email)).toEqual([jana.email]);
  });

  it('never throws, and nothing is left unhandled when everything fails', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { repository, service } = setup();
    repository.findEvent.mockRejectedValue(new Error('db down'));

    expect(() => service.notify(cancelled)).not.toThrow();
    await flush();
    await flush();
    expect(repository.findEvent).toHaveBeenCalledWith('e1');
    jest.restoreAllMocks();
  });
});
