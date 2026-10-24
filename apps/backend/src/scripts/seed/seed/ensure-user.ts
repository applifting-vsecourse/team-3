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
 * Účet bez uživatelského jména, jehož heslo je heslo ze seedu, je nedokončený
 * seed (spadl hned po registraci, dřív např. hledání podle e-mailu s velkými
 * písmeny). Takový účet se dokončí, místo aby se hlásil jako hotový. Shoda hesla
 * je nutná: přes API BetterAuth se dá registrovat i bez jména, a cizí účet se
 * stejným e-mailem (třeba SUPERADMIN_EMAIL) seed nesmí převzít ani povýšit.
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
    if (!(await hasSeedPassword(prisma, auth, existing.id, params.password))) {
      console.warn(
        `${email} exists without a username but not with the seed's password — left as it is`,
      );
      return { user: existing, created: false };
    }
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

  // Usernames are unique. If someone else holds this one, the account gets a
  // derived one (unique through the account id) rather than none: without a
  // username it would count as unfinished and be re-seeded on every start.
  const holder = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  const username =
    holder && holder.id !== account.id
      ? `${params.username}.${account.id}`.slice(0, 50)
      : params.username;
  if (username !== params.username) {
    console.warn(
      `Username ${params.username} is taken; ${email} is seeded as ${username}`,
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

/** Whether the account's sign-in password is the one the seed uses for it. */
async function hasSeedPassword(
  prisma: PrismaService,
  auth: BetterAuth,
  userId: string,
  password: string,
): Promise<boolean> {
  const credential = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { password: true },
  });
  if (!credential?.password) return false;
  const context = await auth.$context;
  return context.password.verify({ hash: credential.password, password });
}
