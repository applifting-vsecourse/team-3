import { PrismaService } from '@/core/prisma/prisma.service';
import {
  communityEvents,
  communityGroups,
  communityUsers,
} from '@/scripts/seed/data/community-data';
import { DEMO_PASSWORD } from '@/scripts/seed/data/demo-data';
import { toEventRow, toGroupRow } from '@/scripts/seed/data/demo-rows';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { ensureUser } from './ensure-user';
import { lookup } from './seed-demo';

/** Advisory lock key for inserting the community data; distinct from the demo seed's. */
const COMMUNITY_SEED_LOCK = 4_702_027;

/**
 * Komunita (community-data.ts): 100 uživatelů po celém Česku, jejich akce a skupiny.
 *
 * Na rozdíl od demo dat (seed-demo.ts) se vkládá i do databáze, kde už akce jsou –
 * staging data má a komunitu má dostat taky. Proto vlastní značka „už vloženo“:
 * jakákoli akce, kterou organizuje komunitní uživatel. Komunita se tak vloží právě
 * jednou, další starty kontejneru ji jen přeskočí.
 *
 * - Účty se zakládají, jen když ještě neexistují (ensureUser).
 * - Skupiny, akce a účasti jdou v jedné transakci pod advisory lockem: buď je tam
 *   všechno, nebo nic, a dva souběžné starty nevloží komunitu dvakrát.
 * - Komunitní uživatelé se hlásí jen na komunitní akce a skupiny; demo akcí #47 se
 *   nic z toho nedotkne. Termíny jsou relativní k okamžiku seedu.
 */
export async function seedCommunity(
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
  for (const communityUser of communityUsers) {
    const { user, created } = await ensureUser(prisma, auth, {
      email: communityUser.email,
      password: DEMO_PASSWORD,
      name: communityUser.name,
      username: communityUser.username,
      emailVerified: communityUser.emailVerified,
      bio: communityUser.bio,
      homeLocalityId: localityId(communityUser.homeLocalitySlug),
      interestActivityIds: communityUser.interestSlugs.map(activityId),
    });
    userIds.set(communityUser.key, user.id);
    if (created) createdUsers++;
  }
  console.log(
    `Community users: ${createdUsers} created, ${communityUsers.length - createdUsers} already existed`,
  );
  const userId = (key: string): string => {
    const id = userIds.get(key);
    if (!id) throw new Error(`Unknown community user ${key}`);
    return id;
  };

  const byCommunity = {
    organizerUserId: { in: [...userIds.values()] },
  };
  if ((await prisma.event.count({ where: byCommunity })) > 0) {
    console.log('Community events already seeded — skipping.');
    return;
  }

  const now = new Date();
  const inserted = await prisma.$transaction(
    async (tx) => {
      // Same as the demo seed: a seed started at the same time waits here
      // and then sees the other one's events (Postgres' READ COMMITTED).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${COMMUNITY_SEED_LOCK})`;
      if ((await tx.event.count({ where: byCommunity })) > 0) return false;

      for (const group of communityGroups.map((g) => toGroupRow(g, now))) {
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

      for (const event of communityEvents.map((e) => toEventRow(e, now))) {
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
      'Another seed inserted the community events meanwhile — skipping.',
    );
    return;
  }

  const participations = communityEvents.reduce(
    (sum, event) => sum + event.participations.length,
    0,
  );
  console.log(
    `Community data: ${communityGroups.length} groups, ${communityEvents.length} events, ` +
      `${participations} participations (dates relative to ${now.toISOString()})`,
  );
}
