import {
  reminderEvent,
  reminderUser,
} from '@/modules/notification/testing/event-reminder.fixture';
import {
  composeOrganizerOverview,
  composeParticipantReminder,
  eventReminderKey,
  eventReminders,
  isDue,
  organizerOverviewDue,
  peopleCount,
  relativeDay,
  ReminderEvent,
} from './event-reminder';

const HOUR = 3600_000;
const start = reminderEvent().startsAt;
const before = (hours: number, ms = 0): Date =>
  new Date(start.getTime() - hours * HOUR + ms);
const sent = (event: ReminderEvent, now: Date): string[] =>
  eventReminders(event, now).map(({ kind, userId }) => `${kind}:${userId}`);

describe('when reminders are due', () => {
  it.each([
    [24, 0, true],
    [24, -1, false],
    [20, -1, true],
    [20, 0, false],
  ])('%s h before the start (%s ms): %s', (hours, ms, due) => {
    expect(isDue(start, 24, before(hours, ms))).toBe(due);
  });

  it('the organizer windows are 48–44 and 24–20 hours before, never both', () => {
    expect(organizerOverviewDue(start, before(48))).toBe('organizer-48h');
    expect(organizerOverviewDue(start, before(44, -1))).toBe('organizer-48h');
    expect(organizerOverviewDue(start, before(44))).toBeNull();
    expect(organizerOverviewDue(start, before(30))).toBeNull();
    expect(organizerOverviewDue(start, before(24))).toBe('organizer-24h');
    expect(organizerOverviewDue(start, before(20))).toBeNull();
  });
});

describe('who gets a reminder', () => {
  it('a day before: approved participants and the organizer short of the minimum', () => {
    expect(sent(reminderEvent(), before(23))).toEqual([
      'participant:alice',
      'participant:bob',
      'organizer-24h:organizer',
    ]);
  });

  it('two days before: only the organizer overview', () => {
    expect(sent(reminderEvent(), before(47))).toEqual([
      'organizer-48h:organizer',
    ]);
  });

  it('nothing between the windows, after the grace or once the event started', () => {
    expect(sent(reminderEvent(), before(30))).toEqual([]);
    expect(sent(reminderEvent(), before(19))).toEqual([]);
    expect(sent(reminderEvent(), before(50))).toEqual([]);
    expect(sent(reminderEvent(), start)).toEqual([]);
  });

  it('no overview once the minimum is reached; the participants still get theirs', () => {
    const event = reminderEvent();
    event.minParticipants = 2;
    expect(sent(event, before(47))).toEqual([]);
    expect(sent(event, before(23))).toEqual([
      'participant:alice',
      'participant:bob',
    ]);
  });

  it.each(['cancelled', 'hidden', 'deleted'] as const)(
    'a %s event gets nothing',
    (status) => {
      const event = { ...reminderEvent(), status };
      expect(sent(event, before(23))).toEqual([]);
      expect(sent(event, before(47))).toEqual([]);
    },
  );

  it('skips blocked, deleted and unverified users, who still count to the minimum', () => {
    const event = reminderEvent();
    event.minParticipants = 3;
    event.participations = [
      { user: { ...reminderUser('blocked'), blockedAt: new Date() } },
      { user: { ...reminderUser('deleted'), deletedAt: new Date() } },
      { user: { ...reminderUser('unverified'), emailVerified: false } },
    ];
    expect(sent(event, before(23))).toEqual([]);
    event.organizer = { ...event.organizer, blockedAt: new Date() };
    event.minParticipants = 4;
    expect(sent(event, before(23))).toEqual([]);
  });

  it('an organizer signed up for their own event gets only the overview', () => {
    const event = reminderEvent();
    event.participations.push({ user: reminderUser('organizer') });
    expect(sent(event, before(23))).toEqual([
      'participant:alice',
      'participant:bob',
      'organizer-24h:organizer',
    ]);
  });

  it('does not depend on the maximum', () => {
    const event = { ...reminderEvent(), maxParticipants: null };
    expect(sent(event, before(23))).toHaveLength(3);
  });
});

describe('send log key', () => {
  it('is unique per kind, event, user and start; a new date reminds again', () => {
    const event = reminderEvent();
    const reminder = { kind: 'participant', userId: 'alice' } as const;
    expect(eventReminderKey(event, reminder)).toBe(
      'event-reminder:participant:event-1:alice:2026-11-28T17:00:00.000Z',
    );
    expect(
      eventReminderKey(
        { ...event, startsAt: new Date('2026-12-05T17:00:00Z') },
        reminder,
      ),
    ).not.toBe(eventReminderKey(event, reminder));
    expect(
      eventReminderKey(event, { kind: 'organizer-24h', userId: 'alice' }),
    ).not.toBe(eventReminderKey(event, reminder));
  });
});

describe('Czech wording', () => {
  it.each([
    [1, '1 člověk'],
    [2, '2 lidé'],
    [4, '4 lidé'],
    [5, '5 lidí'],
    [12, '12 lidí'],
  ])('chybí %s → %s', (count, text) => {
    expect(peopleCount(count)).toBe(text);
  });

  it('names the day by the Prague calendar', () => {
    expect(relativeDay(start, before(23))).toBe('zítra');
    expect(relativeDay(start, before(47))).toBe('pozítří');
    expect(relativeDay(start, before(2))).toBe('dnes');
    // 23:30 Prague, an event at 01:00 the next night: tomorrow by the calendar
    expect(
      relativeDay(
        new Date('2026-11-29T00:00:00Z'),
        new Date('2026-11-28T22:30:00Z'),
      ),
    ).toBe('zítra');
  });

  it('the participant reminder says when, where and links the event', () => {
    const message = composeParticipantReminder(
      reminderEvent(),
      before(23),
      'https://hobbyhub.test',
    );
    expect(message.subject).toBe('Zítra: Večer u deskovek');
    expect(message.email.details).toEqual([
      { label: 'Termín', value: 'so 28. 11. 2026 v 18:00 až 21:00' },
      { label: 'Místo', value: 'Herna Karlín, Praha' },
    ]);
    expect(message.email.action).toEqual({
      label: 'Zobrazit akci',
      url: 'https://hobbyhub.test/akce/event-1',
    });
  });

  it.each([
    [3, 'Do minima chybí 1 člověk'],
    [4, 'Do minima chybí 2 lidé'],
    [7, 'Do minima chybí 5 lidí'],
  ])('the overview with a minimum of %s: %s', (min, heading) => {
    const message = composeOrganizerOverview(
      { ...reminderEvent(), minParticipants: min },
      before(47),
      'https://hobbyhub.test',
      false,
    );
    expect(message.email.heading).toBe(heading);
    expect(message.subject).toBe(`${heading}: Večer u deskovek`);
    expect(message.email.paragraphs[0]).toContain('je pozítří');
  });

  it('the overview offers sharing the event page and cancelling in its management', () => {
    const { email } = composeOrganizerOverview(
      reminderEvent(),
      before(23),
      'https://hobbyhub.test',
      false,
    );
    expect(email.action).toEqual({
      label: 'Sdílet odkaz',
      url: 'https://hobbyhub.test/akce/event-1',
    });
    expect(email.links).toEqual([
      {
        label: 'Zrušit akci',
        url: 'https://hobbyhub.test/akce/event-1/sprava',
      },
    ]);
    expect(email.details).toContainEqual({
      label: 'Obsazenost',
      value: '2 z minima 4',
    });
  });

  it('offers „Topovat akci“ only once topping is switched on', () => {
    const { email } = composeOrganizerOverview(
      reminderEvent(),
      before(23),
      'https://hobbyhub.test',
      true,
    );
    expect(email.links?.map(({ label }) => label)).toEqual([
      'Topovat akci',
      'Zrušit akci',
    ]);
  });
});
