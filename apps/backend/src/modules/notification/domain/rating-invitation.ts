import { eventOverAt } from '@/modules/event/domain/event-over';
import {
  pragueDayOf,
  startOfPragueDay,
} from '@/modules/event/domain/prague-day';
import { eventNotRatable } from '@/modules/rating/domain/participant-rating';
import { ratingDeadline } from '@/modules/rating/domain/rating-window';
import { formatRange } from './format-when';
import { ComposedMessage } from './messages';

export type InvitationRecipient = {
  id: string;
  email: string;
  blockedAt: Date | null;
  deletedAt: Date | null;
};

export type InvitationEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  status: 'published' | 'cancelled' | 'hidden' | 'deleted';
  minParticipants: number;
  organizerUserId: string;
  organizer: InvitationRecipient;
  participations: {
    user: InvitationRecipient;
    rating: { deletedAt: Date | null } | null;
  }[];
  /** Deleted event ratings cannot be given again, even inside the window. */
  ratings: { userId: string }[];
};

export type RatingInvitation = {
  role: 'participant' | 'organizer';
  userId: string;
  email: string;
};

/** Latest daily batch, at 21:00 Prague; subtract from the *next* midnight
 * so the spring/autumn clock change does not shift the evening by an hour. */
export function ratingBatchCutoff(now: Date): Date {
  const day = pragueDayOf(now);
  const evening = new Date(startOfPragueDay(day, 1).getTime() - 3 * 3600_000);
  return evening <= now
    ? evening
    : new Date(startOfPragueDay(day).getTime() - 3 * 3600_000);
}

const deliverable = (user: InvitationRecipient): boolean =>
  user.blockedAt === null && user.deletedAt === null;

/** B-043 / E-01 types 11 and 12. The repository supplies approved
 * participations only; attendance and current group membership do not matter. */
export function ratingInvitations(
  event: InvitationEvent,
  now: Date,
): RatingInvitation[] {
  if (
    eventOverAt(event) > ratingBatchCutoff(now) ||
    eventNotRatable(
      {
        ...event,
        eventStatus: event.status,
        approvedCount: event.participations.length,
      },
      now,
    )
  ) {
    return [];
  }
  const deletedRatings = new Set(event.ratings.map((rating) => rating.userId));
  const others = event.participations.filter(
    ({ user }) => user.id !== event.organizerUserId,
  );
  const invitations: RatingInvitation[] = others
    .filter(({ user }) => deliverable(user) && !deletedRatings.has(user.id))
    .map(({ user }) => ({
      role: 'participant',
      userId: user.id,
      email: user.email,
    }));
  // Only the event's creator rates participants, also for a group event.
  if (
    deliverable(event.organizer) &&
    others.some(({ rating }) => !rating?.deletedAt)
  ) {
    invitations.push({
      role: 'organizer',
      userId: event.organizerUserId,
      email: event.organizer.email,
    });
  }
  return invitations;
}

export const ratingInvitationKey = (
  eventId: string,
  invitation: Pick<RatingInvitation, 'role' | 'userId'>,
): string =>
  `rating-invitation:${invitation.role}:${eventId}:${invitation.userId}`;

/** Reuses the branded event template; only E-01's copy and destinations change. */
export function composeRatingInvitation(
  event: Pick<InvitationEvent, 'id' | 'title' | 'startsAt' | 'endsAt'>,
  role: RatingInvitation['role'],
  frontendUrl: string,
): ComposedMessage {
  const organizer = role === 'organizer';
  const title = `„${event.title}“`;
  return {
    subject: organizer
      ? `Ohodnoť účastníky: ${event.title}`
      : `Jak se povedla akce ${event.title}?`,
    email: {
      preview: `Akce ${title} skončila. ${organizer ? 'Ohodnoť účastníky.' : 'Dej hvězdičky akci a organizátorovi.'}`,
      heading: organizer ? 'Ohodnoť účastníky' : 'Jak se povedla akce?',
      paragraphs: [
        `Akce ${title} skončila.`,
        organizer
          ? 'Dej všem stejně, nebo každému zvlášť – trvá to minutu.'
          : 'Dej hvězdičky akci a organizátorovi. Hodnotit můžeš 14 dní od konce akce.',
      ],
      details: [
        {
          label: 'Termín akce',
          value: formatRange(event.startsAt, event.endsAt),
        },
        {
          label: 'Hodnotit můžeš do',
          value: new Intl.DateTimeFormat('cs-CZ', {
            timeZone: 'Europe/Prague',
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
          }).format(ratingDeadline(event)),
        },
      ],
      quote: null,
      action: {
        label: organizer ? 'Ohodnotit účastníky' : 'Ohodnotit akci',
        url: new URL(
          `/akce/${encodeURIComponent(event.id)}/${organizer ? 'hodnoceni-ucastniku' : 'hodnoceni'}`,
          frontendUrl,
        ).toString(),
      },
    },
  };
}
