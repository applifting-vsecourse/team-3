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
 *
 * Účet bez uživatelského jména je nedokončený seed: registrace v aplikaci jméno
 * vyžaduje, takže ho bez jména mohl založit jen seed, který spadl hned po
 * registraci (dřív hledání podle e-mailu s velkými písmeny nebo kolize jména).
 * Takový účet se dokončí, místo aby se hlásil jako hotový.
 */
export async function ensureUser(
  prisma: PrismaService,
  auth: BetterAuth,
  params: EnsureUserParams,
): Promise<{ user: User; created: boolean }> {
  // BetterAuth stores e-mails lower-cased; look the account up the same way,
  // or an address with capitals (e.g. in SUPERADMIN_EMAIL) is never found
  // again and every later seed fails on „user already exists“.
  const email = params.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.username !== null) {
    return { user: existing, created: false };
  }

  if (existing) {
    console.log(
      `Finishing seeded account ${email}: an earlier seed stopped right after sign-up`,
    );
  } else {
    await auth.api.signUpEmail({
      body: {
        email,
        password: params.password,
        name: params.name,
      },
    });
  }

  const account =
    existing ?? (await prisma.user.findUnique({ where: { email } }));
  if (!account) {
    throw new Error(`Failed to create user with email: ${email}`);
  }

  // Usernames are unique. If someone already holds this one, seed the account
  // without it rather than failing every start on the clash.
  const holder = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  const username =
    holder && holder.id !== account.id ? undefined : params.username;
  if (!username) {
    console.warn(
      `Username ${params.username} is taken; ${email} is seeded without it`,
    );
  }

  const seededAt = new Date();
  const user = await prisma.user.update({
    where: { id: account.id },
    data: {
      username,
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

  return { user, created: !existing };
}
