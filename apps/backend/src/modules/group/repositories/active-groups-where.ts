import { Prisma } from '@/generated/prisma/client';
import { GroupFilters } from '@/modules/group/domain/group';

/**
 * Prisma `where` for the group list. A pure function so it can be tested
 * without a database (CI has none). Public and closed groups are both listed
 * (US-17: only joining a closed group needs approval); deactivated ones are not.
 */
export const buildActiveGroupsWhere = (
  filters: GroupFilters,
): Prisma.GroupWhereInput => {
  // The status rule is its own AND item, so no filter can loosen it.
  const conditions: Prisma.GroupWhereInput[] = [{ status: 'active' }];

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
