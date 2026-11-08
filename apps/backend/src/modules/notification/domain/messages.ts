import { EventNotificationEmailProps } from '@/core/email/templates/event-notification';
import { formatRange } from './format-when';
import {
  EventChange,
  EventNotification,
  NotifiedAnnouncement,
  NotifiedEvent,
  NotifiedEventMessage,
} from './notification';

/** What the e-mail needs besides the notification itself. */
export type MessageContext = {
  event: NotifiedEvent;
  /** The person the notification is about (the applicant, the one who left). */
  person: { name: string } | null;
  frontendUrl: string;
};

/** One e-mail as the user will read it. */
export type ComposedMessage = {
  subject: string;
  email: EventNotificationEmailProps;
};

const eventUrl = (frontendUrl: string, eventId: string, tail = ''): string =>
  new URL(`/akce/${eventId}${tail}`, frontendUrl).toString();

const quoted = (title: string): string => `„${title}“`;

const changeDetails = (
  change: EventChange,
): EventNotificationEmailProps['details'] => {
  const details: EventNotificationEmailProps['details'] = [];
  if (change.when) {
    details.push({
      label: 'Nový termín',
      value: `${formatRange(change.when.to.startsAt, change.when.to.endsAt)} (dříve ${formatRange(change.when.from.startsAt, change.when.from.endsAt)})`,
    });
  }
  if (change.place) {
    const { from, to } = change.place;
    details.push(
      from === to
        ? { label: 'Místo', value: `${to} (poloha na mapě se změnila)` }
        : { label: 'Nové místo', value: `${to} (dříve ${from})` },
    );
  }
  return details;
};

// the verb agrees with the first noun: „změnil termín“, but „změnilo místo“
const whatChanged = (change: EventChange): string =>
  change.when && change.place
    ? 'se změnil termín i místo'
    : change.when
      ? 'se změnil termín'
      : 'se změnilo místo';

/**
 * What every e-mail about an event says (#177). Czech and „ty“ like the app
 * (DESIGN.md › Copy); the organizer may be a woman or a man, so the texts
 * name no gender: „žádost byla schválena“, not „organizátor schválil“.
 * Every message carries a link to the event: the participants' to its page,
 * the organizer's to its management where there is something to do.
 */
export const composeMessage = (
  notification: EventNotification,
  { event, person, frontendUrl }: MessageContext,
): ComposedMessage => {
  const title = quoted(event.title);
  const when = formatRange(event.startsAt, event.endsAt);
  const termin = { label: 'Termín', value: when };
  const name = person?.name ?? 'Někdo';
  const page = eventUrl(frontendUrl, event.id);

  switch (notification.type) {
    case 'request-received':
      return {
        subject: `Nová žádost o účast: ${event.title}`,
        email: {
          preview: `${name} se chce zúčastnit akce ${title}.`,
          heading: 'Nová žádost o účast',
          paragraphs: [
            `${name} se chce zúčastnit akce ${title}. Žádost čeká na tvoje rozhodnutí.`,
          ],
          details: [termin],
          quote: notification.message
            ? { label: 'Zpráva k žádosti', text: notification.message }
            : null,
          action: {
            label: 'Vyřídit žádost',
            url: eventUrl(frontendUrl, event.id, '/sprava'),
          },
        },
      };
    case 'request-decided':
      return notification.outcome === 'approved'
        ? {
            subject: `Máš místo na akci: ${event.title}`,
            email: {
              preview: `Tvoje žádost o účast na akci ${title} byla schválena.`,
              heading: 'Máš místo',
              paragraphs: [
                `Tvoje žádost o účast na akci ${title} byla schválena.`,
                'Když nemůžeš přijít, odhlas se, ať se místo uvolní pro někoho dalšího.',
              ],
              details: [termin, { label: 'Místo', value: event.address }],
              quote: null,
              action: { label: 'Zobrazit akci', url: page },
            },
          }
        : {
            subject: `Žádost o účast nebyla přijata: ${event.title}`,
            email: {
              preview: `Tvoje žádost o účast na akci ${title} nebyla přijata.`,
              heading: 'Žádost nebyla přijata',
              paragraphs: [
                `Tvoje žádost o účast na akci ${title} nebyla přijata.`,
                'Na jiné akce se přihlásit můžeš.',
              ],
              details: [],
              quote: null,
              action: { label: 'Zobrazit akci', url: page },
            },
          };
    case 'event-changed':
      return {
        subject: `Změna u akce: ${event.title}`,
        email: {
          preview: `U akce ${title} ${whatChanged(notification.change)}.`,
          heading: 'Akce se změnila',
          paragraphs: [
            `U akce ${title} ${whatChanged(notification.change)}.`,
            'Zkontroluj, jestli ti nové podmínky vyhovují. Když ne, odhlas se z akce nebo stáhni žádost.',
          ],
          details: changeDetails(notification.change),
          quote: null,
          action: { label: 'Zobrazit akci', url: page },
        },
      };
    case 'event-cancelled':
      return {
        subject: `Akce zrušena: ${event.title}`,
        email: {
          preview: `Akce ${title} byla zrušena.`,
          heading: 'Akce byla zrušena',
          paragraphs: [`Akce ${title}, která měla být ${when}, byla zrušena.`],
          details: [],
          quote: event.cancelReason
            ? { label: 'Důvod zrušení', text: event.cancelReason }
            : null,
          action: { label: 'Zobrazit akci', url: page },
        },
      };
    case 'participant-left':
      return {
        subject: `Odhlášení z akce: ${event.title}`,
        email: {
          preview: `${name} už na akci ${title} nejde.`,
          heading: 'Odhlášení z akce',
          paragraphs: [
            `${name} už na akci ${title} nejde. Místo je zase volné.`,
          ],
          details: [
            termin,
            {
              label: 'Přihlášených',
              value: `${event.approvedCount} z ${event.maxParticipants}`,
            },
          ],
          quote: null,
          action: {
            label: 'Spravovat akci',
            url: eventUrl(frontendUrl, event.id, '/sprava'),
          },
        },
      };
  }
};

// the mail client's preview line: the start of the text, on one line
const PREVIEW_LENGTH = 140;
const previewOf = (text: string): string => {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > PREVIEW_LENGTH
    ? `${line.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…`
    : line;
};

// blank lines split paragraphs; a single line break stays inside one
const paragraphsOf = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/**
 * A group announcement (#194, Figma E-01 type 8): the subject names the
 * group, the heading and the text are the admin's own words, kept as they
 * wrote them (paragraphs split at blank lines), and the button leads to the
 * group's page, where the announcement is too.
 */
export const composeAnnouncement = (
  announcement: NotifiedAnnouncement,
  frontendUrl: string,
): ComposedMessage => ({
  subject: `${announcement.group.name}: ${announcement.subject}`,
  email: {
    preview: previewOf(announcement.body),
    heading: announcement.subject,
    paragraphs: paragraphsOf(announcement.body),
    details: [],
    quote: null,
    action: {
      label: 'Stránka skupiny',
      url: new URL(`/skupiny/${announcement.group.id}`, frontendUrl).toString(),
    },
  },
});

/**
 * The organizer's message to the participants (#176, Figma E-01 type 7):
 * „{akce}: {předmět}“, the heading and the text are the organizer's own
 * words, kept as they wrote them, and the button leads to the event's
 * detail, where the message is too.
 */
export const composeEventMessage = (
  message: NotifiedEventMessage,
  frontendUrl: string,
): ComposedMessage => ({
  subject: `${message.event.title}: ${message.subject}`,
  email: {
    preview: previewOf(message.body),
    heading: message.subject,
    paragraphs: paragraphsOf(message.body),
    details: [],
    quote: null,
    action: {
      label: 'Detail akce',
      url: eventUrl(frontendUrl, message.event.id),
    },
  },
});
