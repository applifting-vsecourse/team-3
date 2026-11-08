import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { EventNotificationEmail } from '@/core/email/templates/event-notification';
import {
  composeAnnouncement,
  ComposedMessage,
  composeMessage,
} from '@/modules/notification/domain/messages';
import {
  EventNotification,
  Notification,
  NotifiedEvent,
  Recipient,
} from '@/modules/notification/domain/notification';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Config } from '@/shared/config/config.service';
import { Inject, Injectable, Logger } from '@nestjs/common';

/** Who gets the notification, and who it is about. */
type Audience = { recipients: Recipient[]; person: { name: string } | null };

/** The e-mail and who it goes to. */
type Prepared = { recipients: Recipient[]; message: ComposedMessage };

/** What a log line names: ids only, never an address. */
const aboutOf = (notification: Notification): string =>
  notification.type === 'group-announcement'
    ? `oznámení ${notification.announcementId}`
    : `akce ${notification.eventId}`;

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
      const prepared =
        notification.type === 'group-announcement'
          ? await this.prepareAnnouncement(notification.announcementId)
          : await this.prepareEventNotification(notification);
      if (!prepared || prepared.recipients.length === 0) return;

      const { recipients, message } = prepared;
      const html = await renderEmail(EventNotificationEmail, message.email);
      // one by one: the mail provider's rate limit counts, and nobody waits
      for (const recipient of recipients) {
        await this.send(notification, recipient, message.subject, html);
      }
    } catch (error) {
      this.logger.error(
        `Upozornění ${notification.type} (${aboutOf(notification)}) se nepodařilo připravit: ${describeError(error)}`,
      );
    }
  }

  /** Null when the event is gone or there is nobody to tell. */
  private async prepareEventNotification(
    notification: EventNotification,
  ): Promise<Prepared | null> {
    const event = await this.repository.findEvent(notification.eventId);
    if (!event) return null;
    const { recipients, person } = await this.audienceOf(notification, event);
    if (recipients.length === 0) return null;
    return {
      recipients,
      message: composeMessage(notification, {
        event,
        person,
        frontendUrl: this.config.frontendUrl,
      }),
    };
  }

  /**
   * A group announcement (#194) goes to every active member of the group,
   * admins included, except the admin who wrote it. Null when it is gone.
   */
  private async prepareAnnouncement(
    announcementId: string,
  ): Promise<Prepared | null> {
    const announcement = await this.repository.findAnnouncement(announcementId);
    if (!announcement) return null;
    return {
      recipients: await this.repository.findActiveMembers(
        announcement.group.id,
        announcement.senderId,
      ),
      message: composeAnnouncement(announcement, this.config.frontendUrl),
    };
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
        `E-mail ${notification.type} (${aboutOf(notification)}) pro uživatele ${recipient.id} se nepodařilo odeslat: ${describeError(error)}`,
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
    notification: EventNotification,
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
