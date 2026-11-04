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
import { groupEvents } from '@/scripts/seed/data/group-events-data';
import { generatedPastEvents } from '@/scripts/seed/data/past-data';
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
 * Celý obsah seedu (demo #47, komunita #150 s krajskými městy #181, akce skupin,
 * proběhlé akce a hodnocení #180 a #181) jako řádky po tabulkách. Id si seed vygeneruje sám, takže vazby (člen → skupina,
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

  const groupIds = new Map<string, string>();
  const groupId = (key: string | null | undefined): string | null => {
    if (!key) return null;
    const id = groupIds.get(key);
    if (!id) throw new Error(`Unknown group ${key}`);
    return id;
  };

  for (const group of [...demoGroups, ...communityGroups].map((g) =>
    toGroupRow(g, now),
  )) {
    const groupId = newId();
    groupIds.set(group.key, groupId);
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

  for (const event of [...demoEvents, ...communityEvents, ...groupEvents].map(
    (e) => toEventRow(e, now),
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
      groupId: groupId(event.groupKey),
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

  for (const event of [...pastEvents, ...generatedPastEvents].map((e) =>
    toPastEventRow(e, now),
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
      approvalMode: 'open',
      visibility: event.visibility ?? 'public',
      organizerUserId: userId(event.organizerKey),
      groupId: groupId(event.groupKey),
      ...(event.cancelReason
        ? {
            status: 'cancelled' as const,
            cancelReason: event.cancelReason,
            // zrušeno den před začátkem
            cancelledAt: new Date(
              event.startsAt.getTime() - 24 * 60 * 60 * 1000,
            ),
          }
        : { status: 'published' as const }),
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
        comment: rating.comment,
        deletedAt: rating.deleted ? now : null,
      })),
    );
  }

  return rows;
}

/** Skupiny, které se v datech před #181 jmenovaly jinak (klíč → tehdejší název). */
const LEGACY_GROUP_NAMES: Record<string, string> = {
  // #167: druhá „Běžci ze Stromovky“ v Praze 7
  'kg-bezci-stromovka': 'Běžci ze Stromovky',
};

/**
 * Jak poznat obsah seedu v databázi z doby před #181, kdy seed id svých řádků
 * neukládal (`SeedState.eventIds`, `groupIds`). Akce: seedový organizátor
 * a název z dat. Skupina: název a lokalita z dat a seedový správce. Akce
 * a skupiny, které pod demo účty založili testeři (třeba „TEST…“ z QA), se
 * tím nechytí. Platí jen pro tento jeden přechod: další verze už mažou podle id.
 */
export function legacySeedContentWhere(
  refs: Pick<ContentRefs, 'userId' | 'localityId'>,
  accountIds: string[],
): { events: Prisma.EventWhereInput; groups: Prisma.GroupWhereInput } {
  const { userId, localityId } = refs;
  const events = [...demoEvents, ...communityEvents, ...pastEvents].map(
    (event) => ({
      organizerUserId: userId(event.organizerKey),
      title: event.title,
    }),
  );
  const groups = [...demoGroups, ...communityGroups].map((group) => ({
    name: LEGACY_GROUP_NAMES[group.key] ?? group.name,
    localityId: localityId(group.localitySlug),
  }));
  return {
    events: { OR: events },
    groups: {
      OR: groups,
      members: { some: { userId: { in: accountIds }, role: 'admin' } },
    },
  };
}
