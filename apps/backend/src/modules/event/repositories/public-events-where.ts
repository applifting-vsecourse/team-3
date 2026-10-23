import { Prisma } from '@/generated/prisma/client';
import { PublicEventFilters } from '@/modules/event/domain/event';
import {
  startOfNextPragueDay,
  startOfPragueDay,
} from '@/modules/event/domain/prague-day';

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
  const conditions: Prisma.EventWhereInput[] = [
    { status: 'published', visibility: 'public', startsAt: { gt: now } },
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
