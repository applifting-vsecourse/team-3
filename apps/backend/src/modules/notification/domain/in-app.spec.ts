import {
  composeAnnouncementInApp,
  composeEventInApp,
  composeEventMessageInApp,
  composeFriendInApp,
  composeGroupRequestInApp,
  InAppType,
  notificationPath,
} from './in-app';
import {
  composeFriendMessage,
  composeGroupRequestMessage,
  composeMessage,
} from './messages';
import {
  EventNotification,
  GroupRequestNotification,
  NotifiedEvent,
} from './notification';

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
const jana = { name: 'Jana Nováková' };
const when = {
  from: { startsAt: event.startsAt, endsAt: null },
  to: { startsAt: new Date('2026-11-12T17:00:00.000Z'), endsAt: null },
};

describe('composeEventInApp', () => {
  it.each<[EventNotification, string, string]>([
    [
      {
        type: 'request-received',
        eventId: 'e1',
        applicantId: 'u2',
        message: null,
      },
      'request_received',
      'Jana Nováková se chce zúčastnit akce „Deskovky ve středu“.',
    ],
    [
      { type: 'participant-left', eventId: 'e1', participantId: 'u2' },
      'participant_left',
      'Jana Nováková už na akci „Deskovky ve středu“ nejde.',
    ],
    [
      {
        type: 'request-decided',
        eventId: 'e1',
        userIds: ['u2'],
        outcome: 'approved',
      },
      'request_approved',
      'Tvoje žádost o účast na akci „Deskovky ve středu“ byla schválena.',
    ],
    [
      {
        type: 'request-decided',
        eventId: 'e1',
        userIds: ['u2'],
        outcome: 'rejected',
      },
      'request_rejected',
      'Tvoje žádost o účast na akci „Deskovky ve středu“ nebyla přijata.',
    ],
    [
      { type: 'event-changed', eventId: 'e1', change: { when, place: null } },
      'event_changed',
      'U akce „Deskovky ve středu“ se změnil termín.',
    ],
    [
      { type: 'event-cancelled', eventId: 'e1' },
      'event_cancelled',
      'Akce „Deskovky ve středu“ byla zrušena.',
    ],
  ])('%j says one short line about the event', (notification, type, text) => {
    expect(composeEventInApp(notification, event, jana)).toEqual({
      type,
      targetType: 'event',
      targetId: 'e1',
      text,
    });
  });

  it('is the first line of the matching e-mail, so the two read as one', () => {
    const kinds: EventNotification[] = [
      {
        type: 'request-received',
        eventId: 'e1',
        applicantId: 'u2',
        message: 'Ahoj',
      },
      { type: 'participant-left', eventId: 'e1', participantId: 'u2' },
      {
        type: 'request-decided',
        eventId: 'e1',
        userIds: ['u2'],
        outcome: 'approved',
      },
      {
        type: 'request-decided',
        eventId: 'e1',
        userIds: ['u2'],
        outcome: 'rejected',
      },
      {
        type: 'event-changed',
        eventId: 'e1',
        change: { when, place: { from: 'A', to: 'B' } },
      },
      { type: 'event-cancelled', eventId: 'e1' },
    ];
    for (const notification of kinds) {
      const email = composeMessage(notification, {
        event,
        person: jana,
        frontendUrl: 'https://hobbyhub.example/',
      });
      expect(composeEventInApp(notification, event, jana).text).toBe(
        email.email.preview,
      );
    }
  });

  it('names „Někdo“ when the person is gone', () => {
    const { text } = composeEventInApp(
      { type: 'participant-left', eventId: 'e1', participantId: 'u2' },
      event,
      null,
    );
    expect(text).toBe('Někdo už na akci „Deskovky ve středu“ nejde.');
  });
});

describe('composeEventMessageInApp and composeAnnouncementInApp', () => {
  it('the organizer’s message names its event and subject and leads to the event', () => {
    expect(
      composeEventMessageInApp({
        id: 'm1',
        subject: 'Změna haly',
        body: 'Hrajeme ve vedlejší hale.',
        senderId: 'u1',
        event: { id: 'e1', title: 'Deskovky ve středu' },
      }),
    ).toEqual({
      type: 'event_message',
      targetType: 'event',
      targetId: 'e1',
      text: 'Nová zpráva k akci „Deskovky ve středu“: Změna haly',
    });
  });

  it('a group announcement names its group and subject and leads to the group', () => {
    expect(
      composeAnnouncementInApp({
        id: 'a1',
        subject: 'Turnaj v sobotu',
        body: 'Přijďte všichni.',
        senderId: 'u1',
        group: { id: 'g1', name: 'Volejbal Pankrác' },
      }),
    ).toEqual({
      type: 'group_announcement',
      targetType: 'group',
      targetId: 'g1',
      text: 'Nové oznámení ve skupině „Volejbal Pankrác“: Turnaj v sobotu',
    });
  });
});

describe('composeGroupRequestInApp (#86)', () => {
  const group = { id: 'g1', name: 'Volejbal Pankrác' };

  it.each<[GroupRequestNotification, string, string]>([
    [
      {
        type: 'group-join-request',
        groupId: 'g1',
        applicantId: 'u2',
        message: null,
      },
      'group_join_request',
      'Jana Nováková chce do skupiny „Volejbal Pankrác“.',
    ],
    [
      {
        type: 'group-request-decided',
        groupId: 'g1',
        userId: 'u2',
        outcome: 'approved',
      },
      'group_request_approved',
      'Tvoje žádost o vstup do skupiny „Volejbal Pankrác“ byla schválena.',
    ],
    [
      {
        type: 'group-request-decided',
        groupId: 'g1',
        userId: 'u2',
        outcome: 'rejected',
      },
      'group_request_rejected',
      'Tvoje žádost o vstup do skupiny „Volejbal Pankrác“ nebyla přijata.',
    ],
  ])(
    '%j says one line about the group, the e-mail’s first',
    (notification, type, text) => {
      expect(composeGroupRequestInApp(notification, group, jana)).toEqual({
        type,
        targetType: 'group',
        targetId: 'g1',
        text,
      });
      expect(
        composeGroupRequestMessage(
          notification,
          group,
          jana,
          'https://hobbyhub.example/',
        ).email.preview,
      ).toBe(text);
    },
  );
});

describe('composeFriendInApp (#307)', () => {
  const petr = { id: 'u7', name: 'Petr Malý' };

  it('a request names who asks and is the e-mail’s first line', () => {
    const notification = {
      type: 'friend-request',
      fromId: 'u7',
      toId: 'u1',
    } as const;
    const inApp = composeFriendInApp(notification, petr);
    expect(inApp).toEqual({
      type: 'friend_request',
      targetType: 'user',
      targetId: 'u7',
      text: 'Petr Malý ti posílá žádost o přátelství.',
    });
    expect(
      composeFriendMessage(notification, petr, 'https://hobbyhub.example/')
        .email.preview,
    ).toBe(inApp.text);
  });

  it('an acceptance names who accepted and is the e-mail’s first line', () => {
    const notification = {
      type: 'friend-accepted',
      fromId: 'u7',
      toId: 'u1',
    } as const;
    const inApp = composeFriendInApp(notification, petr);
    expect(inApp).toEqual({
      type: 'friend_accepted',
      targetType: 'user',
      targetId: 'u7',
      text: 'Petr Malý a ty jste teď přátelé.',
    });
    expect(
      composeFriendMessage(notification, petr, 'https://hobbyhub.example/')
        .email.preview,
    ).toBe(inApp.text);
  });
});

describe('notificationPath', () => {
  it.each<[InAppType, string]>([
    ['request_received', '/akce/e1/sprava'],
    ['participant_joined', '/akce/e1/sprava'],
    ['participant_left', '/akce/e1/sprava'],
    ['request_approved', '/akce/e1'],
    ['request_rejected', '/akce/e1'],
    ['event_changed', '/akce/e1'],
    ['event_cancelled', '/akce/e1'],
    ['event_message', '/akce/e1'],
    ['group_join_request', '/skupiny/e1/sprava'],
    ['group_request_approved', '/skupiny/e1'],
    ['group_request_rejected', '/skupiny/e1'],
    ['group_announcement', '/skupiny/e1'],
    ['friend_request', '/profil/pratele?tab=zadosti'],
    ['friend_accepted', '/uzivatele/e1'],
  ])('%s leads to %s', (type, path) => {
    expect(notificationPath(type, 'e1')).toBe(path);
  });

  it('an id can never leave its path segment', () => {
    expect(notificationPath('event_changed', '../admin')).toBe(
      '/akce/..%2Fadmin',
    );
  });
});
