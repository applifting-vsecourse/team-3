import { PrismaService } from '@/core/prisma/prisma.service';
import { User, UserRole } from '@/generated/prisma/client';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';

type EnsureUserParams = {
  email: string;
  password: string;
  name: string;
  username: string;
  role?: UserRole;
  emailVerified: boolean;
  bio?: string;
  homeLocalityId?: string;
  interestActivityIds?: string[];
};

/**
 * Založí uživatele přes BetterAuth (heslo se uloží stejně jako při registraci),
 * pokud ještě neexistuje. Profil se nastaví jen při založení, takže opakovaný seed
 * nepřepíše, co si demo účet mezitím v aplikaci změnil.
 */
export async function ensureUser(
  prisma: PrismaService,
  auth: BetterAuth,
  params: EnsureUserParams,
): Promise<{ user: User; created: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
  });
  if (existing) {
    return { user: existing, created: false };
  }

  await auth.api.signUpEmail({
    body: {
      email: params.email,
      password: params.password,
      name: params.name,
    },
  });

  const created = await prisma.user.findUnique({
    where: { email: params.email },
  });
  if (!created) {
    throw new Error(`Failed to create user with email: ${params.email}`);
  }

  const seededAt = new Date();
  const user = await prisma.user.update({
    where: { id: created.id },
    data: {
      username: params.username,
      role: params.role ?? 'user',
      emailVerified: params.emailVerified,
      bio: params.bio,
      homeLocalityId: params.homeLocalityId,
      // Demo účty mají souhlasy předem, aby je výzva z B-016 nezastavila uprostřed dema.
      ageConfirmedAt: seededAt,
      termsAcceptedAt: seededAt,
    },
  });

  if (params.interestActivityIds?.length) {
    await prisma.userInterest.createMany({
      data: params.interestActivityIds.map((activityId) => ({
        userId: user.id,
        activityId,
      })),
      skipDuplicates: true,
    });
  }

  return { user, created: true };
}
