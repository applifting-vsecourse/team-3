import { pragueDayOf } from '@/modules/event/domain/prague-day';
import { formatRange, formatWhen } from './format-when';
import { ComposedMessage } from './messages';

/**
 * Scheduled e-mails before an event (#405, B-043): the participants'
 * reminder a day before, and the organizer's overview 48 and 24 hours before
 * while the event is short of its minimum. Pure: the repository supplies the
 * event, the service decides nothing on its own.
 */

export type ReminderRecipient = {
  id: string;
  email: string;
  emailVerified: boolean;
  blockedAt: Date | null;
  deletedAt: Date | null;
};

export type ReminderEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  address: string;
  status: 'published' | 'cancelled' | 'hidden' | 'deleted';
  minParticipants: number;
  organizerUserId: string;
  organizer: ReminderRecipient;
  /** Approved participations only; they are also the occupancy (B-020). */
  participations: { user: ReminderRecipient }[];
};

export type ReminderKind = 'participant' | 'organizer-48h' | 'organizer-24h';

export type EventReminder = {
  kind: ReminderKind;
  userId: string;
  email: string;
};

const HOUR = 3600_000;

/**
 * How long a reminder stays due after its moment: the scheduler runs every
 * 15 minutes, so 4 hours cover retries (3 attempts) and a few hours of
 * outage, yet a reminder never arrives much later than promised.
 */
export const REMINDER_GRACE_HOURS = 4;

/** Hours before the start when each e-mail becomes due. */
const DUE_HOURS = { 'organizer-48h': 48, 'organizer-24h': 24 } as const;
export const PARTICIPANT_REMINDER_HOURS = 24;

/** Whether `now` falls in [startsAt − hours, startsAt − hours + grace). */
export const isDue = (startsAt: Date, hours: number, now: Date): boolean => {
  const due = startsAt.getTime() - hours * HOUR;
  return (
    now.getTime() >= due && now.getTime() < due + REMINDER_GRACE_HOURS * HOUR
  );
};

/** The organizer overview due now, if any (the two windows never overlap). */
export const organizerOverviewDue = (
  startsAt: Date,
  now: Date,
): 'organizer-48h' | 'organizer-24h' | null =>
  isDue(startsAt, DUE_HOURS['organizer-48h'], now)
    ? 'organizer-48h'
    : isDue(startsAt, DUE_HOURS['organizer-24h'], now)
      ? 'organizer-24h'
      : null;

/** Nobody blocked, deleted or with an unconfirmed address is written to. */
const deliverable = (user: ReminderRecipient): boolean =>
  user.emailVerified && user.blockedAt === null && user.deletedAt === null;

/** How many people are still needed to reach the minimum; 0 once reached. */
export const missingToMin = (event: ReminderEvent): number =>
  Math.max(0, event.minParticipants - event.participations.length);

/**
 * Who gets what for this event right now. Only a published event; the
 * maximum plays no role (it may become optional, #425). The organizer gets
 * no participant reminder for their own event, only the overview, and only
 * while the minimum isn't reached.
 */
export function eventReminders(
  event: ReminderEvent,
  now: Date,
): EventReminder[] {
  if (event.status !== 'published' || event.startsAt <= now) return [];
  const reminders: EventReminder[] = [];
  if (isDue(event.startsAt, PARTICIPANT_REMINDER_HOURS, now)) {
    for (const { user } of event.participations) {
      if (user.id !== event.organizerUserId && deliverable(user)) {
        reminders.push({
          kind: 'participant',
          userId: user.id,
          email: user.email,
        });
      }
    }
  }
  const overview = organizerOverviewDue(event.startsAt, now);
  if (overview && missingToMin(event) > 0 && deliverable(event.organizer)) {
    reminders.push({
      kind: overview,
      userId: event.organizerUserId,
      email: event.organizer.email,
    });
  }
  return reminders;
}

/**
 * One log row per kind, event, user and start: a reminder is sent once even
 * across restarts, but an event moved to another date reminds again.
 */
export const eventReminderKey = (
  event: Pick<ReminderEvent, 'id' | 'startsAt'>,
  reminder: Pick<EventReminder, 'kind' | 'userId'>,
): string =>
  `event-reminder:${reminder.kind}:${event.id}:${reminder.userId}:${event.startsAt.toISOString()}`;

/** „1 člověk“, „2 lidé“, „5 lidí“ (with „chybí“, as the issue words it). */
export const peopleCount = (count: number): string =>
  count === 1
    ? '1 člověk'
    : count >= 2 && count <= 4
      ? `${count} lidé`
      : `${count} lidí`;

/** „dnes“, „zítra“, „pozítří“ by the Prague calendar, else the date. */
export const relativeDay = (startsAt: Date, now: Date): string => {
  const days = Math.round(
    (Date.parse(pragueDayOf(startsAt)) - Date.parse(pragueDayOf(now))) /
      (24 * HOUR),
  );
  if (days === 0) return 'dnes';
  if (days === 1) return 'zítra';
  if (days === 2) return 'pozítří';
  return formatWhen(startsAt);
};

const eventUrl = (frontendUrl: string, eventId: string, tail = ''): string =>
  new URL(
    `/akce/${encodeURIComponent(eventId)}${tail}`,
    frontendUrl,
  ).toString();

const capitalized = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** The participant's reminder: subject „Zítra: {akce}“, when, where, the event page. */
export function composeParticipantReminder(
  event: Pick<
    ReminderEvent,
    'id' | 'title' | 'startsAt' | 'endsAt' | 'address'
  >,
  now: Date,
  frontendUrl: string,
): ComposedMessage {
  const day = relativeDay(event.startsAt, now);
  const title = `„${event.title}“`;
  return {
    subject: `${capitalized(day)}: ${event.title}`,
    email: {
      preview: `Akce ${title} je ${day}. Máš na ní místo.`,
      heading: `${capitalized(day)} je akce ${event.title}`,
      paragraphs: [
        `Připomínáme, že máš místo na akci ${title}.`,
        'Když nemůžeš přijít, odhlas se, ať se místo uvolní pro někoho dalšího.',
      ],
      details: [
        { label: 'Termín', value: formatRange(event.startsAt, event.endsAt) },
        { label: 'Místo', value: event.address },
      ],
      quote: null,
      action: { label: 'Zobrazit akci', url: eventUrl(frontendUrl, event.id) },
    },
  };
}

/**
 * The organizer's overview: how many are missing to the minimum, the link to
 * share (the event page, which has „Sdílet“), and the management page to
 * cancel. „Topovat“ (B-073, #69) only once topping exists (`TOPPING_ENABLED`).
 */
export function composeOrganizerOverview(
  event: ReminderEvent,
  now: Date,
  frontendUrl: string,
  toppingEnabled: boolean,
): ComposedMessage {
  const missing = peopleCount(missingToMin(event));
  const title = `„${event.title}“`;
  const day = relativeDay(event.startsAt, now);
  const management = eventUrl(frontendUrl, event.id, '/sprava');
  return {
    subject: `Do minima chybí ${missing}: ${event.title}`,
    email: {
      preview: `Akce ${title} je ${day} a do minima chybí ${missing}.`,
      heading: `Do minima chybí ${missing}`,
      paragraphs: [
        `Akce ${title} je ${day} a do minima ještě chybí ${missing}.`,
        'Pošli odkaz na akci kamarádům nebo ho sdílej ve skupině. Když se akce konat nebude, zruš ji včas, ať to účastníci vědí.',
      ],
      details: [
        { label: 'Termín', value: formatRange(event.startsAt, event.endsAt) },
        {
          label: 'Obsazenost',
          value: `${event.participations.length} z minima ${event.minParticipants}`,
        },
      ],
      quote: null,
      action: { label: 'Sdílet odkaz', url: eventUrl(frontendUrl, event.id) },
      links: [
        ...(toppingEnabled ? [{ label: 'Topovat akci', url: management }] : []),
        { label: 'Zrušit akci', url: management },
      ],
    },
  };
}
