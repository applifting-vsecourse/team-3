import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { EventNotificationEmail } from '@/core/email/templates/event-notification';
import { composeMessage } from '@/modules/notification/domain/messages';
import {
  Notification,
  NotifiedEvent,
  Recipient,
} from '@/modules/notification/domain/notification';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Config } from '@/shared/config/config.service';
import { Inject, Injectable, Logger } from '@nestjs/common';

/** Who gets the notification, and who it is about. */
type Audience = { recipients: Recipient[]; person: { name: string } | null };

/** Provider messages, arbitrary names and unknown codes can contain addresses or credentials. */
const loggedCodes = new Set([
  'EAUTH',
  'ECONNECTION',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EDNS',
  'ESOCKET',
  'ETLS',
  'EPROTOCOL',
  'EENVELOPE',
  'EMESSAGE',
  'ESTREAM',
  'EPIPE',
]);
const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) return 'unknown error';
  const name =
    error instanceof TypeError
      ? 'TypeError'
      : error instanceof RangeError
        ? 'RangeError'
        : 'Error';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && loggedCodes.has(code)
    ? `${name} ${code}`
    : name;
};

/**
 * E-mails about events (#177, B-040, B-041). The one thing a service needs:
 * `notify(...)` after the change is written. It returns at once and never
 * throws; the mails go out afterwards, and a mail that can't be sent is
 * logged and skipped, so it never breaks what the user did or the mails to
 * the others.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly repository: NotificationRepository,
    @Inject('EmailService') private readonly email: EmailService,
    private readonly config: Config,
  ) {}

  /** Schedules delivery without waiting for mail or delaying the domain operation. */
  notify(notification: Notification): void {
    setImmediate(() => {
      void this.deliver(notification);
    });
  }

  /**
   * Looks up who gets the notification and sends each of them the e-mail.
   * Never rejects. Public so a test (or a job) can wait for the result.
   */
  async deliver(notification: Notification): Promise<void> {
    try {
      const event = await this.repository.findEvent(notification.eventId);
      if (!event) return;
      const { recipients, person } = await this.audienceOf(notification, event);
      if (recipients.length === 0) return;

      const message = composeMessage(notification, {
        event,
        person,
        frontendUrl: this.config.frontendUrl,
      });
      const html = await renderEmail(EventNotificationEmail, message.email);
      // one by one: the mail provider's rate limit counts, and nobody waits
      for (const recipient of recipients) {
        await this.send(notification, recipient, message.subject, html);
      }
    } catch (error) {
      this.logger.error(
        `Upozornění ${notification.type} (akce ${notification.eventId}) se nepodařilo připravit: ${describeError(error)}`,
      );
    }
  }

  private async send(
    notification: Notification,
    recipient: Recipient,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.email.sendEmail(recipient.email, subject, html);
    } catch (error) {
      this.logger.warn(
        `E-mail ${notification.type} (akce ${notification.eventId}) pro uživatele ${recipient.id} se nepodařilo odeslat: ${describeError(error)}`,
      );
    }
  }

  /**
   * Who each kind goes to (B-041): the participants hear of the decision on
   * their request, of a change and of a cancellation; the organizer of a new
   * request and of somebody leaving. Nobody gets a mail about what they did
   * themselves.
   */
  private async audienceOf(
    notification: Notification,
    event: NotifiedEvent,
  ): Promise<Audience> {
    switch (notification.type) {
      case 'request-decided':
        return {
          recipients: await this.repository.findRecipients(
            notification.userIds,
          ),
          person: null,
        };
      case 'event-changed':
      case 'event-cancelled':
        return {
          recipients: await this.repository.findAudience(
            event.id,
            event.organizerId,
          ),
          person: null,
        };
      case 'request-received':
      case 'participant-left': {
        const personId =
          notification.type === 'request-received'
            ? notification.applicantId
            : notification.participantId;
        if (personId === event.organizerId) {
          return { recipients: [], person: null };
        }
        const [recipients, name] = await Promise.all([
          this.repository.findRecipients([event.organizerId]),
          this.repository.findPersonName(personId),
        ]);
        return { recipients, person: name ? { name } : null };
      }
    }
  }
}
