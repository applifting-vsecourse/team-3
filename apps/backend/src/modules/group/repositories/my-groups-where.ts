import { Prisma } from '@/generated/prisma/client';

/**
 * Prisma `where` for „Moje skupiny“ (B-056), a pure function so it can be
 * tested without a database: active groups where I am an active member
 * (admins included) or wait for approval. A rejected request no longer
 * exists (#46), a block (#63) and a deactivated group (#54) are left out.
 */
export const buildMyGroupsWhere = (userId: string): Prisma.GroupWhereInput => ({
  status: 'active',
  members: { some: { userId, status: { in: ['active', 'pending'] } } },
});
