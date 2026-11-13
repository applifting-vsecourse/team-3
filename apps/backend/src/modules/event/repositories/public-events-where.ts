import { Prisma } from '@/generated/prisma/client';
import { PublicEventFilters } from '@/modules/event/domain/event';
import { eventOverWhere } from '@/modules/event/domain/event-over';
import {
  startOfNextPragueDay,
  startOfPragueDay,
} from '@/modules/event/domain/prague-day';
import { boxAround } from '@/shared/geo/distance';

/**
 * Prisma `where` for the public event list. A pure function so it can be
 * tested without a database (CI has none). `capacity` is not here: it
 * compares approved participations with the minimum and maximum, which
 * Prisma can't express, so the service applies it.
 */
export const buildPublicEventsWhere = (
  filters: PublicEventFilters,
  now: Date,
): Prisma.EventWhereInput => {
  // The visibility rule is its own AND item, so no filter can loosen it.
  // Upcoming: not started yet; Proběhlé (#61): over by the one rule (#272) –
  // an event going on right now is in neither. Cancelled ones in neither: they
  // didn't take place, only the people they concern see them (Moje, profil).
  const conditions: Prisma.EventWhereInput[] = [
    filters.past
      ? { status: 'published', visibility: 'public', ...eventOverWhere(now) }
      : { status: 'published', visibility: 'public', startsAt: { gt: now } },
  ];

  if (filters.dateFrom) {
    conditions.push({
      startsAt: { gte: startOfPragueDay(filters.dateFrom) },
    });
  }
  if (filters.dateTo) {
    conditions.push({
      startsAt: { lt: startOfNextPragueDay(filters.dateTo) },
    });
  }

  // One level is enough: the catalog has cities and their districts, nothing deeper.
  if (filters.localityId) {
    conditions.push({
      OR: [
        { localityId: filters.localityId },
        { locality: { parentId: filters.localityId } },
      ],
    });
  }

  // the place of the event, not its locality: the map shows events where they happen
  if (filters.bbox) {
    const { west, south, east, north } = filters.bbox;
    conditions.push({
      lat: { gte: south, lte: north },
      lng: { gte: west, lte: east },
    });
  }

  // the circle's rectangle; the service checks the exact distance (#57)
  if (filters.point && filters.radiusKm) {
    const { west, south, east, north } = boxAround(
      filters.point,
      filters.radiusKm,
    );
    conditions.push({
      lat: { gte: south, lte: north },
      lng: { gte: west, lte: east },
    });
  }

  const activityIds = filters.activityIds ?? [];
  const categoryIds = filters.categoryIds ?? [];
  if (activityIds.length > 0 || categoryIds.length > 0) {
    conditions.push({
      OR: [
        ...(activityIds.length > 0
          ? [{ activityId: { in: activityIds } }]
          : []),
        // by category, not by its current activity ids, so activities added later match too
        ...(categoryIds.length > 0
          ? [{ activity: { categoryId: { in: categoryIds } } }]
          : []),
      ],
    });
  }

  return { AND: conditions };
};
