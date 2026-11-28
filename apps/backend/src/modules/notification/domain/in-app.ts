import { inviteJoinedText, whatChanged } from './messages';
import {
  EventNotification,
  FriendNotification,
  GroupRequestNotification,
  NotifiedAnnouncement,
  NotifiedEvent,
  NotifiedEventMessage,
  NotifiedGroup,
} from './notification';

/**
 * The kinds of upozornění in the centre (#86), as the `notification_type`
 * enum stores them; the rows of `docs/navrh-upozorneni.md`.
 */
export type InAppType =
  | 'request_received'
  | 'participant_joined'
  | 'participant_left'
  | 'request_approved'
  | 'request_rejected'
  | 'event_changed'
  | 'event_cancelled'
  | 'event_message'
  | 'group_announcement'
  | 'group_join_request'
  | 'group_request_approved'
  | 'group_request_rejected'
  | 'friend_request'
  | 'friend_accepted'
  | 'friend_invite_joined';

export type InAppTargetType = 'event' | 'group' | 'user';

/** One upozornění as every recipient of it gets it: what it says and where it leads. */
export type InAppMessage = {
  type: InAppType;
  targetType: InAppTargetType;
  targetId: string;
  text: string;
};

const quoted = (title: string): string => `„${title}“`;

/**
 * The short line in the centre for something that happened to an event.
 * It is the first line of the matching e-mail (its preview, #177), so the
 * two read as one, and like the e-mails it names no gender: „už na akci
 * nejde“, not „se odhlásil/a“.
 */
export const composeEventInApp = (
  notification: EventNotification,
  event: NotifiedEvent,
  person: { name: string } | null,
): InAppMessage => {
  const title = quoted(event.title);
  const name = person?.name ?? 'Někdo';
  const about = (type: InAppType, text: string): InAppMessage => ({
    type,
    targetType: 'event',
    targetId: event.id,
    text,
  });
  switch (notification.type) {
    case 'request-received':
      return about(
        'request_received',
        `${name} se chce zúčastnit akce ${title}.`,
      );
    case 'participant-joined':
      return about('participant_joined', `${name} jde na akci ${title}.`);
    case 'participant-left':
      return about('participant_left', `${name} už na akci ${title} nejde.`);
    case 'request-decided':
      return notification.outcome === 'approved'
        ? about(
            'request_approved',
            `Tvoje žádost o účast na akci ${title} byla schválena.`,
          )
        : about(
            'request_rejected',
            `Tvoje žádost o účast na akci ${title} nebyla přijata.`,
          );
    case 'event-changed':
      return about(
        'event_changed',
        `U akce ${title} ${whatChanged(notification.change)}.`,
      );
    case 'event-cancelled':
      return about('event_cancelled', `Akce ${title} byla zrušena.`);
  }
};

/** The organizer's message (#176): its subject, at its event. */
export const composeEventMessageInApp = (
  message: NotifiedEventMessage,
): InAppMessage => ({
  type: 'event_message',
  targetType: 'event',
  targetId: message.event.id,
  text: `Nová zpráva k akci ${quoted(message.event.title)}: ${message.subject}`,
});

/** A group announcement (#194): its subject, at its group. */
export const composeAnnouncementInApp = (
  announcement: NotifiedAnnouncement,
): InAppMessage => ({
  type: 'group_announcement',
  targetType: 'group',
  targetId: announcement.group.id,
  text: `Nové oznámení ve skupině ${quoted(announcement.group.name)}: ${announcement.subject}`,
});

/** A request to join a group (#86): to its admins, and the decision to the applicant. */
export const composeGroupRequestInApp = (
  notification: GroupRequestNotification,
  group: NotifiedGroup,
  person: { name: string } | null,
): InAppMessage => {
  const name = quoted(group.name);
  const about = (type: InAppType, text: string): InAppMessage => ({
    type,
    targetType: 'group',
    targetId: group.id,
    text,
  });
  if (notification.type === 'group-join-request') {
    return about(
      'group_join_request',
      `${person?.name ?? 'Někdo'} chce do skupiny ${name}.`,
    );
  }
  return notification.outcome === 'approved'
    ? about(
        'group_request_approved',
        `Tvoje žádost o vstup do skupiny ${name} byla schválena.`,
      )
    : about(
        'group_request_rejected',
        `Tvoje žádost o vstup do skupiny ${name} nebyla přijata.`,
      );
};

/**
 * Friends (#307): a request names who asks, an acceptance who accepted, an
 * invite (#406) who joined through it; all point at that person
 * (`friend_request` leads to the requests).
 */
export const composeFriendInApp = (
  notification: FriendNotification,
  person: { id: string; name: string },
): InAppMessage =>
  notification.type === 'friend-invite-joined'
    ? {
        type: 'friend_invite_joined',
        targetType: 'user',
        targetId: person.id,
        text: inviteJoinedText(person.name, notification.befriended),
      }
    : notification.type === 'friend-request'
      ? {
          type: 'friend_request',
          targetType: 'user',
          targetId: person.id,
          text: `${person.name} ti posílá žádost o přátelství.`,
        }
      : {
          type: 'friend_accepted',
          targetType: 'user',
          targetId: person.id,
          text: `${person.name} a ty jste teď přátelé.`,
        };

/**
 * Where a click on the upozornění leads, in the frontend. The organizer's
 * kinds lead to the event's management, where the request or the list is;
 * a group admin's to the group's; friends to the requests or the friend.
 */
export const notificationPath = (type: InAppType, targetId: string): string => {
  const id = encodeURIComponent(targetId);
  switch (type) {
    case 'request_received':
    case 'participant_joined':
    case 'participant_left':
      return `/akce/${id}/sprava`;
    case 'request_approved':
    case 'request_rejected':
    case 'event_changed':
    case 'event_cancelled':
    case 'event_message':
      return `/akce/${id}`;
    case 'group_join_request':
      return `/skupiny/${id}/sprava`;
    case 'group_request_approved':
    case 'group_request_rejected':
    case 'group_announcement':
      return `/skupiny/${id}`;
    case 'friend_request':
      return '/profil/pratele?tab=zadosti';
    case 'friend_accepted':
    case 'friend_invite_joined':
      return `/uzivatele/${id}`;
  }
};
