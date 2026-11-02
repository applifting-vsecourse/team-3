import { Prisma } from '@/generated/prisma/client';
import {
  communityEvents,
  communityGroups,
  communityUsers,
} from '@/scripts/seed/data/community-data';
import {
  demoEvents,
  demoGroups,
  demoUsers,
} from '@/scripts/seed/data/demo-data';
import { toEventRow, toGroupRow } from '@/scripts/seed/data/demo-rows';
import { pastEvents, toPastEventRow } from '@/scripts/seed/data/rating-data';

/** Účty seedu: demo #47 a komunita #150. Superadmin mezi nimi není. */
export const seedAccounts = [...demoUsers, ...communityUsers];

/** Převod klíčů a slugů z dat na id v databázi; `newId` dává id nových řádků. */
export type ContentRefs = {
  now: Date;
  userId: (key: string) => string;
  activityId: (slug: string) => string;
  localityId: (slug: string) => string;
  newId: () => string;
};

export type ContentRows = {
  groups: Prisma.GroupCreateManyInput[];
  groupMembers: Prisma.GroupMemberCreateManyInput[];
  events: Prisma.EventCreateManyInput[];
  participations: Prisma.ParticipationCreateManyInput[];
  ratings: Prisma.RatingCreateManyInput[];
  participantRatings: Prisma.ParticipantRatingCreateManyInput[];
};

/**
 * Celý obsah seedu (demo #47, komunita #150, proběhlé akce a hodnocení #180) jako
 * řádky po tabulkách. Id si seed vygeneruje sám, takže vazby (člen → skupina,
 * účast → akce) jsou hotové předem a každá tabulka jde vložit jedním `createMany`.
 * Čistá funkce bez Prismy, aby šla otestovat.
 */
export function buildContentRows(refs: ContentRefs): ContentRows {
  const { now, userId, activityId, localityId, newId } = refs;
  const rows: ContentRows = {
    groups: [],
    groupMembers: [],
    events: [],
    participations: [],
    ratings: [],
    participantRatings: [],
  };

  for (const group of [...demoGroups, ...communityGroups].map((g) =>
    toGroupRow(g, now),
  )) {
    const groupId = newId();
    rows.groups.push({
      id: groupId,
      name: group.name,
      description: group.description,
      activityId: activityId(group.activitySlug),
      localityId: localityId(group.localitySlug),
      type: group.type,
      status: group.status,
      deactivatedAt: group.deactivatedAt,
    });
    rows.groupMembers.push(
      ...group.members.map((member) => ({
        groupId,
        userId: userId(member.userKey),
        role: member.role,
        status: member.status,
        message: member.message,
      })),
    );
  }

  for (const event of [...demoEvents, ...communityEvents].map((e) =>
    toEventRow(e, now),
  )) {
    const eventId = newId();
    rows.events.push({
      id: eventId,
      title: event.title,
      description: event.description,
      activityId: activityId(event.activitySlug),
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      lat: event.lat,
      lng: event.lng,
      address: event.address,
      localityId: localityId(event.localitySlug),
      minParticipants: event.minParticipants,
      maxParticipants: event.maxParticipants,
      price: event.price,
      level: event.level,
      equipment: event.equipment,
      approvalMode: event.approvalMode,
      visibility: event.visibility,
      organizerUserId: userId(event.organizerKey),
      status: event.status,
      cancelReason: event.cancelReason,
      cancelledAt: event.cancelledAt,
    });
    rows.participations.push(
      ...event.participations.map((participation) => ({
        eventId,
        userId: userId(participation.userKey),
        status: participation.status,
        message: participation.message,
        approvedAt: participation.approvedAt,
      })),
    );
  }

  for (const event of pastEvents.map((e) => toPastEventRow(e, now))) {
    const eventId = newId();
    rows.events.push({
      id: eventId,
      title: event.title,
      description: event.description,
      activityId: activityId(event.activitySlug),
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      lat: event.lat,
      lng: event.lng,
      address: event.address,
      localityId: localityId(event.localitySlug),
      minParticipants: event.minParticipants,
      maxParticipants: event.maxParticipants,
      approvalMode: 'open',
      visibility: 'public',
      organizerUserId: userId(event.organizerKey),
      status: 'published',
    });
    rows.participations.push(
      ...event.participations.map((participation) => ({
        eventId,
        userId: userId(participation.userKey),
        status: 'approved' as const,
        approvedAt: participation.approvedAt,
      })),
    );
    rows.ratings.push(
      ...event.ratings.map((rating) => ({
        eventId,
        userId: userId(rating.userKey),
        eventStars: rating.eventStars,
        organizerStars: rating.organizerStars,
        comment: rating.comment,
        deletedAt: rating.deleted ? now : null,
      })),
    );
    rows.participantRatings.push(
      ...event.participantRatings.map((rating) => ({
        eventId,
        participantId: userId(rating.userKey),
        stars: rating.stars,
        deletedAt: rating.deleted ? now : null,
      })),
    );
  }

  return rows;
}
