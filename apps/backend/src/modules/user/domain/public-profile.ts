import type { Prisma } from '@/generated/prisma/client';
import { eventOverWhere, isEventOver } from '@/modules/event/domain/event-over';
import type { ProfileVisibility } from '@/modules/profile/domain/profile';
import {
  organizerRatingSummary,
  participantRatingSummary,
  summarizeStars,
  type RatingSummary,
} from '@/modules/rating/domain/rating-summary';
import { byCzechName } from '@/shared/text/czech-order';
import { canSee, type ProfileViewer } from './profile-visibility';

export type PublicPerson = { id: string; name: string };
export type PublicUserRecord = PublicPerson & {
  interests: { activity: PublicPerson }[];
  /** #64: shown only as `…Visibility` allows (`visibleDetails`) */
  bio: string | null;
  photoImageKey: string | null;
  photoVisibility: ProfileVisibility;
  bioVisibility: ProfileVisibility;
  pastEventsVisibility: ProfileVisibility;
};
/** What the past event card shows of where and what (Figma Karta akce/Proběhlá řádek). */
type PublicPlace = { id: string; slug: string; name: string };
type PublicActivity = PublicPlace & {
  category: PublicPlace & { icon: string };
};
type EventBoundary = { status: string; startsAt: Date; endsAt: Date | null };
export type ReceivedRatingRecord = {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  event: EventBoundary & {
    id: string;
    title: string;
    visibility: string;
    organizer: PublicPerson & {
      deletedAt: Date | null;
      blockedAt: Date | null;
    };
  };
};
export type PersonalRatingRecord = {
  organizerStars: number;
  eventStars: number;
  deletedAt: Date | null;
  event: EventBoundary & {
    id: string;
    groupId: string | null;
    organizerUserId: string;
  };
};
export type PublicEventRecord = EventBoundary & {
  id: string;
  title: string;
  visibility: string;
  groupId: string | null;
  organizerUserId: string;
  address: string;
  locality: PublicPlace;
  activity: PublicActivity;
  minParticipants: number;
  _count: { participations: number };
};
/** An event the person went to (#64): a public one of someone else's, with its ratings' event stars. */
export type AttendedEventRecord = PublicEventRecord & {
  ratings: { eventStars: number }[];
};
export type PublicReceivedRating = {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
  author: PublicPerson | null;
  event: { id: string; title: string };
};
export type PublicOrganizedEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  localityName: string;
  activityName: string;
  /** For the past event card (#179): its photo by the activity, the place from the address. */
  address: string;
  locality: PublicPlace;
  activity: PublicActivity;
  approvedCount: number;
  /** Above 0 it didn't take place: the card says „Nekonalo se“, as its detail (review #323). */
  missingToMin: number;
  rating: RatingSummary;
};
export type PublicUserProfile = PublicPerson & {
  interests: PublicPerson[];
  participantSummary: RatingSummary;
  organizerSummary: RatingSummary;
  eventSummary: RatingSummary;
  participantRatings: PublicReceivedRating[];
  organizedEvents: PublicOrganizedEvent[];
};
/** Events that are over (#272), as everywhere else. */
export function finishedEventWhere(now: Date): Prisma.EventWhereInput {
  return eventOverWhere(now);
}
const visibleFinished = (event: EventBoundary, now: Date): boolean =>
  event.status === 'published' && isEventOver(event, now);

/** Public projection: no account, home locality, attendance or membership data. */
export function publicProfile(
  user: PublicUserRecord,
  receivedRows: ReceivedRatingRecord[],
  personalRows: PersonalRatingRecord[],
  eventRows: PublicEventRecord[],
  now: Date,
): PublicUserProfile {
  const received = receivedRows.filter(
    (row) => row.deletedAt === null && visibleFinished(row.event, now),
  );
  const personal = personalRows.filter(
    (row) =>
      row.deletedAt === null &&
      row.event.groupId === null &&
      row.event.organizerUserId === user.id &&
      visibleFinished(row.event, now),
  );
  const eventRatings = new Map<string, number[]>();
  for (const row of personal) {
    const stars = eventRatings.get(row.event.id) ?? [];
    stars.push(row.eventStars);
    eventRatings.set(row.event.id, stars);
  }
  return {
    id: user.id,
    name: user.name,
    // in Czech order, not the database's (#370)
    interests: byCzechName(
      user.interests.map(({ activity }) => ({
        id: activity.id,
        name: activity.name,
      })),
    ),
    participantSummary: participantRatingSummary(received),
    organizerSummary: organizerRatingSummary(personal),
    eventSummary: summarizeStars(personal.map((row) => row.eventStars)),
    // Only ratings from public events are listed: one from a private or
    // members-only event would reveal who organised it and when the user was
    // there. Those count in the average alone, which names nobody.
    participantRatings: received
      .filter((row) => row.event.visibility === 'public')
      .map((row) => ({
        id: row.id,
        stars: row.stars,
        comment: row.comment,
        createdAt: row.createdAt,
        author:
          row.event.organizer.deletedAt || row.event.organizer.blockedAt
            ? null
            : { id: row.event.organizer.id, name: row.event.organizer.name },
        event: { id: row.event.id, title: row.event.title },
      })),
    organizedEvents: eventRows
      .filter(
        (event) =>
          event.organizerUserId === user.id &&
          event.groupId === null &&
          event.visibility === 'public' &&
          visibleFinished(event, now),
      )
      .map((event) => pastEventCard(event, eventRatings.get(event.id) ?? [])),
  };
}

/** A past event as its card shows it (Figma Karta akce/Proběhlá řádek). */
function pastEventCard(
  event: PublicEventRecord,
  eventStars: number[],
): PublicOrganizedEvent {
  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    localityName: event.locality.name,
    activityName: event.activity.name,
    address: event.address,
    locality: {
      id: event.locality.id,
      slug: event.locality.slug,
      name: event.locality.name,
    },
    activity: {
      id: event.activity.id,
      slug: event.activity.slug,
      name: event.activity.name,
      category: {
        id: event.activity.category.id,
        slug: event.activity.category.slug,
        name: event.activity.category.name,
        icon: event.activity.category.icon,
      },
    },
    approvedCount: event._count.participations,
    missingToMin: Math.max(
      0,
      event.minParticipants - event._count.participations,
    ),
    rating: summarizeStars(eventStars),
  };
}

/** How many visited events the profile lists (#64), the latest first. */
export const PAST_EVENTS_TAKE = 10;

/** What the person chose who sees (B-014, #64); null = not for this viewer (or nothing there). */
export type VisibleDetails = {
  bio: string | null;
  /** The uploaded photo at GET /api/images/{photoKey}. */
  photoKey: string | null;
  /** Visited events; null = hidden from this viewer, [] = none yet. */
  pastEvents: PublicOrganizedEvent[] | null;
};

/**
 * The photo, the bio and the visited events as far as the viewer may see them
 * (B-014, #64). `attended` is loaded only when they may (`canSee`), but it is
 * checked here again: nothing hidden leaves by mistake.
 */
export function visibleDetails(
  user: PublicUserRecord,
  viewer: ProfileViewer,
  attended: AttendedEventRecord[] | null,
  now: Date,
): VisibleDetails {
  const pastEvents =
    attended && canSee(user.pastEventsVisibility, viewer)
      ? attended
          .filter(
            (event) =>
              event.organizerUserId !== user.id &&
              event.visibility === 'public' &&
              visibleFinished(event, now),
          )
          .slice(0, PAST_EVENTS_TAKE)
          .map((event) =>
            pastEventCard(
              event,
              event.ratings.map(({ eventStars }) => eventStars),
            ),
          )
      : null;
  return {
    bio: canSee(user.bioVisibility, viewer) ? user.bio : null,
    photoKey: canSee(user.photoVisibility, viewer) ? user.photoImageKey : null,
    pastEvents,
  };
}
