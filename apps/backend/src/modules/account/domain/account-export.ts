import { Prisma } from '@/generated/prisma/client';

/**
 * „Stáhnout moje data“ (B-080, #64; GDPR art. 20: structured, machine-readable).
 * Everything the app keeps about the person, and nothing about anyone else
 * beyond what the app shows them anyway: other people appear by name only,
 * never by e-mail or id. Explicit selects, never a spread: sign-in secrets
 * (password hashes, tokens) and moderation notes can't leak in.
 */

export const ACCOUNT_EXPORT_VERSION = 1;

/** Another person, as the app shows them: the name only. */
const person = { select: { name: true } } as const;
const eventRef = {
  select: { id: true, title: true, startsAt: true },
} as const;

export const exportProfileSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  username: true,
  image: true,
  bio: true,
  role: true,
  createdAt: true,
  ageConfirmedAt: true,
  termsAcceptedAt: true,
  onboardingCompletedAt: true,
  photoVisibility: true,
  bioVisibility: true,
  pastEventsVisibility: true,
  homeLocality: { select: { name: true } },
  interests: {
    select: { activity: { select: { name: true } } },
    orderBy: { activity: { name: 'asc' } },
  },
  accounts: { select: { providerId: true, createdAt: true } },
  subscription: { select: { validUntil: true, createdAt: true } },
} satisfies Prisma.UserSelect;

export const exportParticipationSelect = {
  status: true,
  message: true,
  approvedAt: true,
  createdAt: true,
  event: eventRef,
  rating: { select: { stars: true, comment: true, createdAt: true } },
} satisfies Prisma.ParticipationSelect;

export const exportOrganizedEventSelect = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  address: true,
  minParticipants: true,
  maxParticipants: true,
  price: true,
  approvalMode: true,
  visibility: true,
  status: true,
  cancelReason: true,
  createdAt: true,
  activity: { select: { name: true } },
  locality: { select: { name: true } },
  group: { select: { name: true } },
} satisfies Prisma.EventSelect;

export const exportMembershipSelect = {
  role: true,
  status: true,
  message: true,
  createdAt: true,
  group: { select: { id: true, name: true } },
} satisfies Prisma.GroupMemberSelect;

export const exportRatingGivenSelect = {
  eventStars: true,
  organizerStars: true,
  comment: true,
  createdAt: true,
  deletedAt: true,
  event: eventRef,
} satisfies Prisma.RatingSelect;

/** Ratings of the person's events: who gave them is shown in the app, so the name. */
export const exportRatingReceivedSelect = {
  eventStars: true,
  organizerStars: true,
  comment: true,
  createdAt: true,
  event: eventRef,
  user: person,
} satisfies Prisma.RatingSelect;

export const exportFriendshipSelect = {
  status: true,
  createdAt: true,
  acceptedAt: true,
  requesterId: true,
  requester: person,
  addressee: person,
} satisfies Prisma.FriendshipSelect;

export const exportNotificationSelect = {
  type: true,
  text: true,
  createdAt: true,
  readAt: true,
} satisfies Prisma.NotificationSelect;

export const exportMessageSelect = {
  subject: true,
  body: true,
  createdAt: true,
  event: { select: { id: true, title: true } },
} satisfies Prisma.EventMessageSelect;

export const exportAnnouncementSelect = {
  subject: true,
  body: true,
  createdAt: true,
  group: { select: { id: true, name: true } },
} satisfies Prisma.GroupAnnouncementSelect;

export const exportPaymentSelect = {
  type: true,
  amount: true,
  status: true,
  createdAt: true,
  confirmedAt: true,
  event: { select: { id: true, title: true } },
} satisfies Prisma.PaymentSelect;

export const exportReportSelect = {
  targetType: true,
  reason: true,
  comment: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ReportSelect;

export type AccountExportRows = {
  profile: Prisma.UserGetPayload<{ select: typeof exportProfileSelect }>;
  participations: Prisma.ParticipationGetPayload<{
    select: typeof exportParticipationSelect;
  }>[];
  organizedEvents: Prisma.EventGetPayload<{
    select: typeof exportOrganizedEventSelect;
  }>[];
  groupMemberships: Prisma.GroupMemberGetPayload<{
    select: typeof exportMembershipSelect;
  }>[];
  ratingsGiven: Prisma.RatingGetPayload<{
    select: typeof exportRatingGivenSelect;
  }>[];
  ratingsReceivedAsOrganizer: Prisma.RatingGetPayload<{
    select: typeof exportRatingReceivedSelect;
  }>[];
  friendships: Prisma.FriendshipGetPayload<{
    select: typeof exportFriendshipSelect;
  }>[];
  notifications: Prisma.NotificationGetPayload<{
    select: typeof exportNotificationSelect;
  }>[];
  eventMessages: Prisma.EventMessageGetPayload<{
    select: typeof exportMessageSelect;
  }>[];
  groupAnnouncements: Prisma.GroupAnnouncementGetPayload<{
    select: typeof exportAnnouncementSelect;
  }>[];
  payments: Prisma.PaymentGetPayload<{ select: typeof exportPaymentSelect }>[];
  reports: Prisma.ReportGetPayload<{ select: typeof exportReportSelect }>[];
};

/** The file's content, as `GET /api/me/export` sends it. */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- the shape is the projection below
export function toAccountExport(
  userId: string,
  rows: AccountExportRows,
  now: Date,
) {
  const { profile } = rows;
  return {
    format: 'hobbyhub-account-export',
    version: ACCOUNT_EXPORT_VERSION,
    exportedAt: now,
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      emailVerified: profile.emailVerified,
      username: profile.username,
      image: profile.image,
      bio: profile.bio,
      role: profile.role,
      createdAt: profile.createdAt,
      ageConfirmedAt: profile.ageConfirmedAt,
      termsAcceptedAt: profile.termsAcceptedAt,
      onboardingCompletedAt: profile.onboardingCompletedAt,
      homeLocality: profile.homeLocality?.name ?? null,
      interests: profile.interests.map(({ activity }) => activity.name),
      visibility: {
        photo: profile.photoVisibility,
        bio: profile.bioVisibility,
        pastEvents: profile.pastEventsVisibility,
      },
      // how one signs in, never the secrets of it
      signInMethods: profile.accounts.map((account) => ({
        provider:
          account.providerId === 'credential' ? 'password' : account.providerId,
        since: account.createdAt,
      })),
      subscription: profile.subscription,
    },
    participations: rows.participations.map((row) => ({
      event: row.event,
      status: row.status,
      message: row.message,
      createdAt: row.createdAt,
      approvedAt: row.approvedAt,
      // how the organizer rated one as a participant (#180)
      ratingReceived: row.rating,
    })),
    organizedEvents: rows.organizedEvents.map((event) => ({
      ...event,
      activity: event.activity.name,
      locality: event.locality.name,
      group: event.group?.name ?? null,
    })),
    groupMemberships: rows.groupMemberships,
    ratingsGiven: rows.ratingsGiven.map(({ deletedAt, ...rating }) => ({
      ...rating,
      removedByModeration: deletedAt !== null,
    })),
    ratingsReceivedAsOrganizer: rows.ratingsReceivedAsOrganizer.map(
      ({ user, ...rating }) => ({ ...rating, author: user.name }),
    ),
    friendships: rows.friendships.map((row) => {
      const sent = row.requesterId === userId;
      return {
        person: (sent ? row.addressee : row.requester).name,
        direction: sent ? 'sent' : 'received',
        status: row.status,
        createdAt: row.createdAt,
        acceptedAt: row.acceptedAt,
      };
    }),
    notifications: rows.notifications,
    eventMessagesSent: rows.eventMessages,
    groupAnnouncementsSent: rows.groupAnnouncements,
    payments: rows.payments,
    reportsFiled: rows.reports,
  };
}

export type AccountExport = ReturnType<typeof toAccountExport>;
