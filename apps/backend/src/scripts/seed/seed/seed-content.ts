import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { DEMO_PASSWORD } from '@/scripts/seed/data/demo-data';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import {
  buildContentRows,
  legacySeedContentWhere,
  seedAccounts,
} from './content-rows';
import {
  ensureUser,
  replaceSeedPassword,
  restoreSeedPassword,
} from './ensure-user';

/**
 * Verze testovacích dat (#181). PR, který změní data v `data/`, číslo zvedne a staging
 * po deployi data vymění sám. 1 = data před #181 (bez verze v databázi), 2 = verze
 * dat a opravy z #167, 3 = krajská města, akce skupin a další proběhlé akce (#181),
 * 4 = komentáře k hodnocení účastníků (PO 4. 11.).
 */
export const SEED_DATA_VERSION = 4;

/** Řádek `SeedState` s verzí testovacích dat. */
export const SEED_STATE_KEY = 'demo';

/**
 * Řádek `SeedState`, že účty z doby před N-3 už heslo z repa nemají. Ověření
 * hesla (scrypt) stojí asi 70 ms na účet, a tak se po první výměně nedělá.
 */
export const REPO_PASSWORD_REPLACED_KEY = 'repo-password-replaced';

/** Advisory lock key for replacing the seed's content; any constant unique to it. */
const CONTENT_SEED_LOCK = 4_702_026;

/**
 * Obsah seedu: demo účty #47 a komunita #150, jejich skupiny, akce (i krajských
 * měst a skupin, #181), účasti a hodnocení (#180, #181). Řídí se verzí v `SeedState`:
 *
 * - Účty se zakládají vždy, jen když ještě neexistují (ensureUser).
 * - Má-li databáze verzi SEED_DATA_VERSION, nic dalšího se neděje: další starty
 *   kontejneru data neposunou. Bez řádku `SeedState` (nová databáze, data před
 *   #181) je verze 0.
 * - Jinak se v jedné transakci pod advisory lockem smažou akce a skupiny, které
 *   vložil předchozí seed (deleteSeedContent), profily seedových účtů se nastaví
 *   podle dat, všechno se vloží znovu s termíny relativními k teď a zapíše se
 *   nová verze i s id vložených akcí a skupin. Co testeři založili, i pod demo
 *   účty (QA na stagingu), zůstane.
 * - Při nové verzi dostanou seedové účty zpět heslo `password` (#229): tester
 *   ho na stagingu mohl změnit a odkaz pro obnovu hesla v produkci do logu
 *   nejde (N-6). Ověření stojí asi 70 ms na účet, proto jen při nové verzi.
 * - Mezi verzemi hesla seed nemění, s jednou výjimkou (N-3): účet, který má
 *   pořád heslo z repa (DEMO_PASSWORD), dostane `password`, když je jiné. Jen
 *   jednou, pak to hlídá řádek REPO_PASSWORD_REPLACED_KEY: účty založené potom
 *   už heslo z repa nedostanou.
 */
export async function seedContent(
  prisma: PrismaService,
  auth: BetterAuth,
  password: string = DEMO_PASSWORD,
): Promise<void> {
  const activities = await prisma.activity.findMany({
    select: { id: true, slug: true },
  });
  const localities = await prisma.locality.findMany({
    select: { id: true, slug: true },
  });
  const activityId = lookup(activities, (a) => a.slug, 'activity');
  const localityId = lookup(localities, (l) => l.slug, 'locality');

  const replacePassword =
    password !== DEMO_PASSWORD &&
    !(await prisma.seedState.findUnique({
      where: { key: REPO_PASSWORD_REPLACED_KEY },
    }));
  const userIds = new Map<string, string>();
  let createdUsers = 0;
  let rotatedPasswords = 0;
  for (const account of seedAccounts) {
    const { user, created } = await ensureUser(prisma, auth, {
      email: account.email,
      password,
      name: account.name,
      username: account.username,
      emailVerified: account.emailVerified,
      bio: account.bio,
      homeLocalityId: localityId(account.homeLocalitySlug),
      interestActivityIds: account.interestSlugs.map(activityId),
    });
    userIds.set(account.key, user.id);
    if (created) createdUsers++;
    else if (
      replacePassword &&
      (await replaceSeedPassword(
        prisma,
        auth,
        user.id,
        DEMO_PASSWORD,
        password,
      ))
    ) {
      rotatedPasswords++;
    }
  }
  if (replacePassword) {
    // upsert: a seed started at the same time may have written it already
    await prisma.seedState.upsert({
      where: { key: REPO_PASSWORD_REPLACED_KEY },
      create: { key: REPO_PASSWORD_REPLACED_KEY, version: 1 },
      update: {},
    });
  }
  console.log(
    `Seed accounts: ${createdUsers} created, ${seedAccounts.length - createdUsers} already existed`,
  );
  if (rotatedPasswords > 0) {
    console.log(
      `Seed accounts: ${rotatedPasswords} moved off the password from the repo (N-3), their sessions ended`,
    );
  }
  const userId = lookup(
    [...userIds].map(([key, id]) => ({ key, id })),
    (u) => u.key,
    'seed account',
  );

  const current = (await seedState(prisma))?.version ?? 0;
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
      const state = await seedState(tx);
      if (state?.version === SEED_DATA_VERSION) return false;

      // Data před #181 id svých řádků nemají: poznají se podle obsahu.
      const previous = state
        ? { eventIds: state.eventIds, groupIds: state.groupIds }
        : await findLegacySeedContent(
            tx,
            legacySeedContentWhere({ userId, localityId }, accountIds),
          );
      await deleteSeedContent(tx, previous, accountIds);
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
      // #236: only a verified e-mail signs in. An account set back to
      // unverified (a tester may have verified Eva meanwhile) is signed out.
      await tx.session.deleteMany({
        where: {
          userId: {
            in: seedAccounts
              .filter((account) => !account.emailVerified)
              .map((account) => userId(account.key)),
          },
        },
      });
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

      const inserted = {
        version: SEED_DATA_VERSION,
        eventIds: rows.events.map((event) => event.id!),
        groupIds: rows.groups.map((group) => group.id!),
      };
      await tx.seedState.upsert({
        where: { key: SEED_STATE_KEY },
        create: { key: SEED_STATE_KEY, ...inserted },
        update: { ...inserted, appliedAt: now },
      });
      return true;
    },
    { timeout: 120_000 },
  );
  if (!replaced) {
    console.log('Another seed replaced the seed data meanwhile — skipping.');
    return;
  }

  // After the transaction: scrypt for ~170 accounts would hold its lock for
  // seconds. Only the seed that replaced the data gets here.
  let restoredPasswords = 0;
  for (const id of accountIds) {
    if (await restoreSeedPassword(prisma, auth, id, password)) {
      restoredPasswords++;
    }
  }
  if (restoredPasswords > 0) {
    console.log(
      `Seed accounts: ${restoredPasswords} got the seed password back, their sessions ended (#229)`,
    );
  }

  console.log(
    `Seed data v${current} → v${SEED_DATA_VERSION}: ${rows.groups.length} groups, ` +
      `${rows.events.length} events, ${rows.participations.length} participations, ` +
      `${rows.ratings.length} ratings, ${rows.participantRatings.length} participant ratings ` +
      `(dates relative to ${now.toISOString()})`,
  );
}

/** Řádek s verzí dat; `null`, když ho seed ještě nezapsal. */
async function seedState(
  prisma: Pick<PrismaService, 'seedState'>,
): Promise<{ version: number; eventIds: string[]; groupIds: string[] } | null> {
  return prisma.seedState.findUnique({ where: { key: SEED_STATE_KEY } });
}

export type SeededIds = { eventIds: string[]; groupIds: string[] };

/** Id akcí a skupin seedu v databázi z doby před #181 (legacySeedContentWhere). */
export async function findLegacySeedContent(
  tx: Prisma.TransactionClient,
  where: ReturnType<typeof legacySeedContentWhere>,
): Promise<SeededIds> {
  const [events, groups] = await Promise.all([
    tx.event.findMany({ where: where.events, select: { id: true } }),
    tx.group.findMany({ where: where.groups, select: { id: true } }),
  ]);
  return {
    eventIds: events.map((event) => event.id),
    groupIds: groups.map((group) => group.id),
  };
}

/**
 * Smaže akce a skupiny, které vložil předchozí seed; účasti, členství, obě
 * hodnocení, zprávy a záznamy upozornění zmizí kaskádou, u plateb se `eventId`
 * vynuluje. Cizí akci v seedové skupině (tester po #70) nesmaže, jen ji od
 * skupiny odpojí, jinak by smazání skupiny zastavil `onDelete: Restrict`.
 * Do logu jde, co zmizí a co ze seedových účtů zůstává, ať je to na stagingu vidět.
 */
export async function deleteSeedContent(
  tx: Prisma.TransactionClient,
  seeded: SeededIds,
  accountIds: string[],
): Promise<void> {
  const notSeeded = { id: { notIn: seeded.eventIds } };
  const detached = await tx.event.updateMany({
    where: { groupId: { in: seeded.groupIds }, ...notSeeded },
    data: { groupId: null },
  });
  const kept = await tx.event.count({
    where: { organizerUserId: { in: accountIds }, ...notSeeded },
  });
  const events = await tx.event.deleteMany({
    where: { id: { in: seeded.eventIds } },
  });
  const groups = await tx.group.deleteMany({
    where: { id: { in: seeded.groupIds } },
  });
  console.log(
    `Removed the previous seed data: ${events.count} events, ${groups.count} groups. ` +
      `Kept ${kept} events that testers created under seed accounts; ` +
      `${detached.count} testers' events detached from the removed groups.`,
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
