import { PrismaService } from '@/core/prisma/prisma.service';
import {
  DEMO_PASSWORD,
  demoEvents,
  demoGroups,
  demoUsers,
} from '@/scripts/seed/data/demo-data';
import { toEventRow, toGroupRow } from '@/scripts/seed/data/demo-rows';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { ensureUser } from './ensure-user';

/**
 * Testovací data #47: demo účty, skupiny, akce a účasti.
 *
 * - Demo účty se zakládají, jen když ještě neexistují.
 * - Skupiny a akce se vloží jen do databáze, kde žádné akce ani skupiny nejsou.
 *   Termíny jsou relativní k okamžiku seedu, takže pozdější deploy je nesmí posunout.
 *   Pro nové termíny je potřeba databázi vyčistit (`pnpm backend db:reset`).
 * - Skupiny, akce a účasti jdou v jedné transakci: buď je tam všechno, nebo nic,
 *   a nepovedený seed se při dalším startu zopakuje celý.
 */
/** Advisory lock key for inserting the demo data; any constant unique to it. */
const DEMO_SEED_LOCK = 4_702_026;

export async function seedDemo(
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
  for (const demoUser of demoUsers) {
    const { user, created } = await ensureUser(prisma, auth, {
      email: demoUser.email,
      password: DEMO_PASSWORD,
      name: demoUser.name,
      username: demoUser.username,
      emailVerified: demoUser.emailVerified,
      bio: demoUser.bio,
      homeLocalityId: localityId(demoUser.homeLocalitySlug),
      interestActivityIds: demoUser.interestSlugs.map(activityId),
    });
    userIds.set(demoUser.key, user.id);
    if (created) createdUsers++;
  }
  console.log(
    `Demo users: ${createdUsers} created, ${demoUsers.length - createdUsers} already existed`,
  );
  const userId = (key: string): string => {
    const id = userIds.get(key);
    if (!id) throw new Error(`Unknown demo user ${key}`);
    return id;
  };

  const [eventCount, groupCount] = await Promise.all([
    prisma.event.count(),
    prisma.group.count(),
  ]);
  if (eventCount > 0 || groupCount > 0) {
    console.log(
      `Database already has ${eventCount} event(s) and ${groupCount} group(s) — ` +
        'skipping demo groups and events.',
    );
    return;
  }

  const now = new Date();
  const inserted = await prisma.$transaction(
    async (tx) => {
      // Two seeds starting at once (overlapping container starts) must not
      // both insert: the lock makes the second one wait until the first has
      // committed, and the counts inside the transaction then see its data.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${DEMO_SEED_LOCK})`;
      const [events, groups] = await Promise.all([
        tx.event.count(),
        tx.group.count(),
      ]);
      if (events > 0 || groups > 0) return false;

      for (const group of demoGroups.map((g) => toGroupRow(g, now))) {
        await tx.group.create({
          data: {
            name: group.name,
            description: group.description,
            activityId: activityId(group.activitySlug),
            localityId: localityId(group.localitySlug),
            type: group.type,
            status: group.status,
            deactivatedAt: group.deactivatedAt,
            members: {
              createMany: {
                data: group.members.map((member) => ({
                  userId: userId(member.userKey),
                  role: member.role,
                  status: member.status,
                  message: member.message,
                })),
              },
            },
          },
        });
      }

      for (const event of demoEvents.map((e) => toEventRow(e, now))) {
        await tx.event.create({
          data: {
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
            status: event.status,
            cancelReason: event.cancelReason,
            cancelledAt: event.cancelledAt,
            participations: {
              createMany: {
                data: event.participations.map((participation) => ({
                  userId: userId(participation.userKey),
                  status: participation.status,
                  message: participation.message,
                  approvedAt: participation.approvedAt,
                })),
              },
            },
          },
        });
      }
      return true;
    },
    { timeout: 120_000 },
  );
  if (!inserted) {
    console.log(
      'Another seed inserted the demo groups and events meanwhile — skipping.',
    );
    return;
  }

  const participations = demoEvents.reduce(
    (sum, event) => sum + event.participations.length,
    0,
  );
  console.log(
    `Demo data: ${demoGroups.length} groups, ${demoEvents.length} events, ` +
      `${participations} participations (dates relative to ${now.toISOString()})`,
  );
}

function lookup<T extends { id: string }>(
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
