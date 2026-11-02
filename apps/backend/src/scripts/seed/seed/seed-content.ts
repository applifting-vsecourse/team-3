import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { DEMO_PASSWORD } from '@/scripts/seed/data/demo-data';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { buildContentRows, seedAccounts } from './content-rows';
import { ensureUser } from './ensure-user';

/**
 * Verze testovacích dat (#181). PR, který změní data v `data/`, číslo zvedne a staging
 * po deployi data vymění sám. 1 = data před #181 (bez verze v databázi).
 */
export const SEED_DATA_VERSION = 2;

/** Řádek `SeedState` s verzí testovacích dat. */
export const SEED_STATE_KEY = 'demo';

/** Advisory lock key for replacing the seed's content; any constant unique to it. */
const CONTENT_SEED_LOCK = 4_702_026;

/**
 * Obsah seedu: demo účty #47 a komunita #150, jejich skupiny, akce, účasti
 * a hodnocení (#180). Řídí se verzí v `SeedState`:
 *
 * - Účty se zakládají vždy, jen když ještě neexistují (ensureUser).
 * - Má-li databáze verzi SEED_DATA_VERSION, nic dalšího se neděje: další starty
 *   kontejneru data neposunou. Bez řádku `SeedState` (nová databáze, data před
 *   #181) je verze 0.
 * - Jinak se v jedné transakci pod advisory lockem smaže obsah seedových účtů
 *   (deleteSeedContent), jejich profily se nastaví podle dat, všechno se vloží
 *   znovu s termíny relativními k teď a zapíše se nová verze. Akce a účty
 *   testerů zůstanou, hesla seedových účtů seed nemění.
 */
export async function seedContent(
  prisma: PrismaService,
  auth: BetterAuth,
): Promise<void> {
  const activities = await prisma.activity.findMany({
    select: { id: true, slug: true },
  });
  const localities = await prisma.locality.findMany({
    select: { id: true, slug: true },
  });
  const activityId = lookup(activities, (a) => a.slug, 'activity');
  const localityId = lookup(localities, (l) => l.slug, 'locality');

  const userIds = new Map<string, string>();
  let createdUsers = 0;
  for (const account of seedAccounts) {
    const { user, created } = await ensureUser(prisma, auth, {
      email: account.email,
      password: DEMO_PASSWORD,
      name: account.name,
      username: account.username,
      emailVerified: account.emailVerified,
      bio: account.bio,
      homeLocalityId: localityId(account.homeLocalitySlug),
      interestActivityIds: account.interestSlugs.map(activityId),
    });
    userIds.set(account.key, user.id);
    if (created) createdUsers++;
  }
  console.log(
    `Seed accounts: ${createdUsers} created, ${seedAccounts.length - createdUsers} already existed`,
  );
  const userId = lookup(
    [...userIds].map(([key, id]) => ({ key, id })),
    (u) => u.key,
    'seed account',
  );

  const current = await seedVersion(prisma);
  if (current === SEED_DATA_VERSION) {
    console.log(`Seed data v${current} already in place — skipping.`);
    return;
  }

  const now = new Date();
  const rows = buildContentRows({
    now,
    userId,
    activityId,
    localityId,
    newId: randomUUID,
  });
  const accountIds = [...userIds.values()];

  const replaced = await prisma.$transaction(
    async (tx) => {
      // A seed started at the same time waits here and then sees the version
      // the first one wrote (Postgres' default READ COMMITTED).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CONTENT_SEED_LOCK})`;
      if ((await seedVersion(tx)) === SEED_DATA_VERSION) return false;

      await deleteSeedContent(tx, accountIds);
      for (const account of seedAccounts) {
        await tx.user.update({
          where: { id: userId(account.key) },
          data: {
            name: account.name,
            bio: account.bio,
            emailVerified: account.emailVerified,
            homeLocalityId: localityId(account.homeLocalitySlug),
          },
        });
      }
      await tx.userInterest.deleteMany({
        where: { userId: { in: accountIds } },
      });
      await tx.userInterest.createMany({
        data: seedAccounts.flatMap((account) =>
          account.interestSlugs.map((slug) => ({
            userId: userId(account.key),
            activityId: activityId(slug),
          })),
        ),
      });

      await tx.group.createMany({ data: rows.groups });
      await tx.groupMember.createMany({ data: rows.groupMembers });
      await tx.event.createMany({ data: rows.events });
      await tx.participation.createMany({ data: rows.participations });
      await tx.rating.createMany({ data: rows.ratings });
      await tx.participantRating.createMany({ data: rows.participantRatings });

      await tx.seedState.upsert({
        where: { key: SEED_STATE_KEY },
        create: { key: SEED_STATE_KEY, version: SEED_DATA_VERSION },
        update: { version: SEED_DATA_VERSION, appliedAt: now },
      });
      return true;
    },
    { timeout: 120_000 },
  );
  if (!replaced) {
    console.log('Another seed replaced the seed data meanwhile — skipping.');
    return;
  }

  console.log(
    `Seed data v${current} → v${SEED_DATA_VERSION}: ${rows.groups.length} groups, ` +
      `${rows.events.length} events, ${rows.participations.length} participations, ` +
      `${rows.ratings.length} ratings, ${rows.participantRatings.length} participant ratings ` +
      `(dates relative to ${now.toISOString()})`,
  );
}

/** Verze dat v databázi; 0, když ji seed ještě nezapsal. */
async function seedVersion(
  prisma: Pick<PrismaService, 'seedState'>,
): Promise<number> {
  const state = await prisma.seedState.findUnique({
    where: { key: SEED_STATE_KEY },
  });
  return state?.version ?? 0;
}

/**
 * Smaže, co patří seedovým účtům: jejich akce a skupiny, kde je některý z nich
 * správcem. Akce v těch skupinách jdou pryč i od testerů, jinak by smazání
 * skupiny zastavil `onDelete: Restrict`. Účasti, členství, obě hodnocení, zprávy
 * a záznamy upozornění zmizí kaskádou, u plateb se `eventId` vynuluje.
 */
export async function deleteSeedContent(
  tx: Prisma.TransactionClient,
  accountIds: string[],
): Promise<void> {
  const seedGroups: Prisma.GroupWhereInput = {
    members: { some: { userId: { in: accountIds }, role: 'admin' } },
  };
  const events = await tx.event.deleteMany({
    where: {
      OR: [{ organizerUserId: { in: accountIds } }, { group: seedGroups }],
    },
  });
  const groups = await tx.group.deleteMany({ where: seedGroups });
  console.log(
    `Removed the previous seed data: ${events.count} events, ${groups.count} groups`,
  );
}

/** Id podle slugu / klíče; neznámý klíč je chyba v datech nebo nenaseedovaný katalog. */
export function lookup<T extends { id: string }>(
  rows: T[],
  keyOf: (row: T) => string,
  label: string,
): (key: string) => string {
  const ids = new Map(rows.map((row) => [keyOf(row), row.id]));
  return (key) => {
    const id = ids.get(key);
    if (!id) {
      throw new Error(`Unknown ${label} ${key} — is the catalog seeded?`);
    }
    return id;
  };
}
