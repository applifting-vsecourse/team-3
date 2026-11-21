import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { EventNotificationEmail } from '@/core/email/templates/event-notification';
import {
  composeAnnouncementInApp,
  composeEventInApp,
  composeEventMessageInApp,
  composeFriendInApp,
  composeGroupRequestInApp,
  InAppMessage,
} from '@/modules/notification/domain/in-app';
import {
  composeAnnouncement,
  ComposedMessage,
  composeEventMessage,
  composeFriendMessage,
  composeGroupRequestMessage,
  composeMessage,
} from '@/modules/notification/domain/messages';
import {
  EventNotification,
  FriendNotification,
  GroupRequestNotification,
  Notification,
  NotifiedEvent,
  Recipient,
} from '@/modules/notification/domain/notification';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Config } from '@/shared/config/config.service';
import { Inject, Injectable, Logger } from '@nestjs/common';

/** Who gets the notification, and who it is about. */
type Audience = { recipients: Recipient[]; person: { name: string } | null };

/**
 * The e-mail and who it goes to, and the upozornění in the centre (#86) and
 * who gets that: the same people, except where the e-mail goes to its author too.
 */
type Prepared = {
  recipients: Recipient[];
  message: ComposedMessage;
  inApp: InAppMessage;
  inAppRecipientIds: string[];
};

/** What a log line names: ids only, never an address. */
const aboutOf = (notification: Notification): string => {
  switch (notification.type) {
    case 'group-announcement':
      return `oznámení ${notification.announcementId}`;
    case 'event-message':
      return `akce ${notification.eventId}, zpráva ${notification.messageId}`;
    case 'group-join-request':
      return `skupina ${notification.groupId}, žadatel ${notification.applicantId}`;
    case 'group-request-decided':
      return `skupina ${notification.groupId}, žadatel ${notification.userId}`;
    case 'friend-request':
    case 'friend-accepted':
      return `uživatel ${notification.fromId} → ${notification.toId}`;
    default:
      return `akce ${notification.eventId}`;
  }
};

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
 * E-mails about events (#177, B-040, B-041) and the upozornění in the centre
 * (#86) from the same events. The one thing a service needs: `notify(...)`
 * after the change is written. It returns at once and never throws; the
 * upozornění are written and the mails go out afterwards, and what can't be
 * written or sent is logged and skipped, so it never breaks what the user did
 * or what the others get.
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
   * Looks up who gets the notification, writes their upozornění in the
   * centre and sends each of them the e-mail. Never rejects. Public so a
   * test (or a job) can wait for the result.
   */
  async deliver(notification: Notification): Promise<void> {
    try {
      const prepared =
        notification.type === 'group-announcement'
          ? await this.prepareAnnouncement(notification.announcementId)
          : notification.type === 'event-message'
            ? await this.prepareEventMessage(notification.messageId)
            : notification.type === 'friend-request' ||
                notification.type === 'friend-accepted'
              ? await this.prepareFriendNotification(notification)
              : notification.type === 'group-join-request' ||
                  notification.type === 'group-request-decided'
                ? await this.prepareGroupRequest(notification)
                : await this.prepareEventNotification(notification);
      if (!prepared) return;
      // the centre first: it doesn't wait for the mail provider
      await this.store(notification, prepared);
      if (prepared.recipients.length === 0) return;

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
      inApp: composeEventInApp(notification, event, person),
      inAppRecipientIds: recipients.map(({ id }) => id),
    };
  }

  /**
   * A group announcement (#194) goes to every active member of the group,
   * admins and its author included: Figma D-08 promises it to all of them,
   * and the author's copy shows what the members got. The upozornění in the
   * centre doesn't go to the author: it is news only to the others. Null
   * when it is gone.
   */
  private async prepareAnnouncement(
    announcementId: string,
  ): Promise<Prepared | null> {
    const announcement = await this.repository.findAnnouncement(announcementId);
    if (!announcement) return null;
    const recipients = await this.repository.findActiveMembers(
      announcement.group.id,
    );
    return {
      recipients,
      message: composeAnnouncement(announcement, this.config.frontendUrl),
      inApp: composeAnnouncementInApp(announcement),
      inAppRecipientIds: recipients
        .map(({ id }) => id)
        .filter((id) => id !== announcement.senderId),
    };
  }

  /**
   * The organizer's message (#176) goes to every approved participant of
   * the event, not to the organizer who wrote it, and not to anyone waiting,
   * rejected or removed. Null when it is gone.
   */
  private async prepareEventMessage(
    messageId: string,
  ): Promise<Prepared | null> {
    const message = await this.repository.findEventMessage(messageId);
    if (!message) return null;
    const recipients = await this.repository.findApprovedParticipants(
      message.event.id,
      message.senderId,
    );
    return {
      recipients,
      message: composeEventMessage(message, this.config.frontendUrl),
      inApp: composeEventMessageInApp(message),
      inAppRecipientIds: recipients.map(({ id }) => id),
    };
  }

  /**
   * A request to join a group (#86): every active admin hears of it (the
   * applicant is never one), the applicant of the decision. Null when the
   * group is gone or there is nobody to tell.
   */
  private async prepareGroupRequest(
    notification: GroupRequestNotification,
  ): Promise<Prepared | null> {
    const group = await this.repository.findGroup(notification.groupId);
    if (!group) return null;
    let recipients: Recipient[];
    let person: { name: string } | null = null;
    if (notification.type === 'group-join-request') {
      const [admins, name] = await Promise.all([
        this.repository.findGroupAdmins(group.id),
        this.repository.findPersonName(notification.applicantId),
      ]);
      recipients = admins.filter(({ id }) => id !== notification.applicantId);
      person = name ? { name } : null;
    } else {
      recipients = await this.repository.findRecipients([notification.userId]);
    }
    if (recipients.length === 0) return null;
    return {
      recipients,
      message: composeGroupRequestMessage(
        notification,
        group,
        person,
        this.config.frontendUrl,
      ),
      inApp: composeGroupRequestInApp(notification, group, person),
      inAppRecipientIds: recipients.map(({ id }) => id),
    };
  }

  /**
   * Friends (#307, #86): the one asked hears of a request, the one who asked
   * of the acceptance; the e-mail names the other person. Null when either
   * of them can't be written to or named (blocked, deleted, gone).
   */
  private async prepareFriendNotification(
    notification: FriendNotification,
  ): Promise<Prepared | null> {
    const [recipients, name] = await Promise.all([
      this.repository.findRecipients([notification.toId]),
      this.repository.findPersonName(notification.fromId),
    ]);
    if (recipients.length === 0 || name === null) return null;
    const person = { id: notification.fromId, name };
    return {
      recipients,
      message: composeFriendMessage(
        notification,
        person,
        this.config.frontendUrl,
      ),
      inApp: composeFriendInApp(notification, person),
      inAppRecipientIds: recipients.map(({ id }) => id),
    };
  }

  /** Writes the upozornění in the centre (#86); a failure is logged, the e-mails still go. */
  private async store(
    notification: Notification,
    { inApp, inAppRecipientIds }: Prepared,
  ): Promise<void> {
    try {
      await this.repository.createInApp(inAppRecipientIds, inApp);
    } catch (error) {
      this.logger.error(
        `Upozornění ${notification.type} (${aboutOf(notification)}) se nepodařilo uložit do centra: ${describeError(error)}`,
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
