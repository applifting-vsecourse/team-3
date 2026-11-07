import type { Prisma } from '@/generated/prisma/client';
import {
  organizerRatingSummary,
  participantRatingSummary,
  summarizeStars,
  type RatingSummary,
} from '@/modules/rating/domain/rating-summary';

export type PublicPerson = { id: string; name: string };
export type PublicUserRecord = PublicPerson & {
  interests: { activity: PublicPerson }[];
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
  locality: { name: string };
  activity: { name: string };
  _count: { participations: number };
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
  approvedCount: number;
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
export function finishedEventWhere(now: Date): Prisma.EventWhereInput {
  return {
    OR: [{ endsAt: { lte: now } }, { endsAt: null, startsAt: { lte: now } }],
  };
}
const visibleFinished = (event: EventBoundary, now: Date): boolean =>
  event.status === 'published' &&
  (event.endsAt ?? event.startsAt).getTime() <= now.getTime();

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
    interests: user.interests.map(({ activity }) => ({
      id: activity.id,
      name: activity.name,
    })),
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
      .map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        localityName: event.locality.name,
        activityName: event.activity.name,
        approvedCount: event._count.participations,
        rating: summarizeStars(eventRatings.get(event.id) ?? []),
      })),
  };
}
