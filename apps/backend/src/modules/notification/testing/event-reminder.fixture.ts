import {
  ReminderEvent,
  ReminderRecipient,
} from '@/modules/notification/domain/event-reminder';

export const reminderUser = (id: string): ReminderRecipient => ({
  id,
  email: `${id}@example.test`,
  emailVerified: true,
  blockedAt: null,
  deletedAt: null,
});

/** Saturday 28. 11. 2026, 18:00 Prague; one approved of the minimum of 4. */
export const reminderEvent = (): ReminderEvent => ({
  id: 'event-1',
  title: 'Večer u deskovek',
  startsAt: new Date('2026-11-28T17:00:00Z'),
  endsAt: new Date('2026-11-28T20:00:00Z'),
  address: 'Herna Karlín, Praha',
  status: 'published',
  minParticipants: 4,
  organizerUserId: 'organizer',
  organizer: reminderUser('organizer'),
  participations: [
    { user: reminderUser('alice') },
    { user: reminderUser('bob') },
  ],
});
