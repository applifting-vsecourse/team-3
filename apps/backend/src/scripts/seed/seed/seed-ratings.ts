import { PrismaService } from '@/core/prisma/prisma.service';
import { demoUsers } from '@/scripts/seed/data/demo-data';
import { pastEvents, toPastEventRow } from '@/scripts/seed/data/rating-data';
import { lookup } from './seed-demo';

/** Advisory lock key for inserting the past events; distinct from the other seeds'. */
const RATINGS_SEED_LOCK = 4_702_028;

/**
 * Proběhlé akce a hodnocení (#180, rating-data.ts) pro profil (#178, #179).
 *
 * Jako komunita (seed-community.ts) se vkládá i do databáze, kde už akce jsou,
 * aby byly hvězdičky vidět i na stagingu. Značka „už vloženo“: jakékoli
 * hodnocení účastníka. Tabulka je nová (#180) a do #66 do ní nic jiného nepíše.
 * Proběhlá akce značkou být nemůže: demo akce #47 na stagingu mezitím proběhly.
 * Až #66 začne ukládat skutečná hodnocení, značku je potřeba přehodnotit:
 * hodnocení od uživatelů by pak seed přeskočilo i v databázi bez těchto akcí.
 *
 * - Dvě hodnocení (jedno Rating, jedno ParticipantRating) jsou smazaná
 *   superadminem (`deletedAt`), ale bez záznamu ModerationAction: zásahy
 *   superadmina přijdou s B-063, i se záznamem do seedu.
 * - Potřebuje demo účty (seed-demo.ts běží před ním). Když nějaký chybí,
 *   nevloží nic.
 * - Akce, účasti a obě hodnocení jdou v jedné transakci pod advisory lockem.
 */
export async function seedRatings(prisma: PrismaService): Promise<void> {
  if ((await prisma.participantRating.count()) > 0) {
    console.log('Past events and ratings already seeded — skipping.');
    return;
  }

  const keys = new Set(
    pastEvents.flatMap((event) => [
      event.organizerKey,
      ...event.participantKeys,
    ]),
  );
  const emails = demoUsers
    .filter((user) => keys.has(user.key))
    .map((user) => user.email);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  if (users.length !== emails.length) {
    console.log(
      `Past events and ratings need ${emails.length} demo users, found ${users.length} — skipping.`,
    );
    return;
  }
  const idByEmail = new Map(users.map((user) => [user.email, user.id]));
  const userId = (key: string): string => {
    const email = demoUsers.find((user) => user.key === key)?.email;
    const id = email && idByEmail.get(email);
    if (!id) throw new Error(`Unknown demo user ${key}`);
    return id;
  };

  const activities = await prisma.activity.findMany({
    select: { id: true, slug: true },
  });
  const localities = await prisma.locality.findMany({
    select: { id: true, slug: true },
  });
  const activityId = lookup(activities, (a) => a.slug, 'activity');
  const localityId = lookup(localities, (l) => l.slug, 'locality');

  const now = new Date();
  const inserted = await prisma.$transaction(
    async (tx) => {
      // Same as the other seeds: one started at the same time waits here and
      // then sees the ratings the first one inserted (READ COMMITTED).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${RATINGS_SEED_LOCK})`;
      if ((await tx.participantRating.count()) > 0) return false;

      for (const event of pastEvents.map((e) => toPastEventRow(e, now))) {
        const { id: eventId } = await tx.event.create({
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
            approvalMode: 'open',
            visibility: 'public',
            organizerUserId: userId(event.organizerKey),
            status: 'published',
            participations: {
              createMany: {
                data: event.participations.map((participation) => ({
                  userId: userId(participation.userKey),
                  status: 'approved' as const,
                  approvedAt: participation.approvedAt,
                })),
              },
            },
          },
          select: { id: true },
        });
        await tx.rating.createMany({
          data: event.ratings.map((rating) => ({
            eventId,
            userId: userId(rating.userKey),
            eventStars: rating.eventStars,
            organizerStars: rating.organizerStars,
            comment: rating.comment,
            deletedAt: rating.deleted ? now : null,
          })),
        });
        await tx.participantRating.createMany({
          data: event.participantRatings.map((rating) => ({
            eventId,
            participantId: userId(rating.userKey),
            stars: rating.stars,
            deletedAt: rating.deleted ? now : null,
          })),
        });
      }
      return true;
    },
    { timeout: 60_000 },
  );
  if (!inserted) {
    console.log('Another seed inserted the ratings meanwhile — skipping.');
    return;
  }

  const count = (pick: (e: (typeof pastEvents)[number]) => unknown[]): number =>
    pastEvents.reduce((sum, event) => sum + pick(event).length, 0);
  console.log(
    `Past events: ${pastEvents.length} events, ${count((e) => e.ratings)} ratings, ` +
      `${count((e) => e.participantRatings)} participant ratings (dates relative to ${now.toISOString()})`,
  );
}
