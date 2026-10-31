import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { ensureUser } from './ensure-user';
import { seedCatalog } from './seed-catalog';
import { seedCommunity } from './seed-community';
import { seedDemo } from './seed-demo';

/** Passes the sign-up's name rule (#153): no brackets, unlike the template's. */
export const SUPERADMIN_NAME = 'Správce HobbyHubu';

export const demoDataEnabled = (env: NodeJS.ProcessEnv): boolean => {
  if (env.SEED_DEMO_DATA === 'true') return true;
  if (env.SEED_DEMO_DATA === 'false') return false;
  return env.NODE_ENV !== 'production';
};

/**
 * Seed je opakovatelný: lokálně ho spouští každý `pnpm dev`, na stagingu každý start
 * kontejneru. Nic nemaže a nic, co už v databázi je, nezakládá znovu.
 *
 * 1. Číselník aktivit a lokalit – vždy (aplikace bez něj nefunguje).
 * 2. Superadmin z SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD – když chybí.
 * 3. Testovací data #47 – jejich hesla jsou v repu, takže v produkci jen se
 *    SEED_DEMO_DATA=true (staging ho má v Dockerfile.deploy). Jinde vypnout
 *    jde proměnnou SEED_DEMO_DATA=false.
 * 4. Komunita (100 uživatelů s akcemi a skupinami po Česku) – pod stejným
 *    přepínačem, vkládá se jednou i do databáze, která už data má.
 */
export const seedDatabase = async (
  prisma: PrismaService,
  config: Config,
  betterAuth: BetterAuth,
): Promise<void> => {
  await seedCatalog(prisma);

  // Superadmin. This should be deleted in a production app.
  // A failure here (e.g. SUPERADMIN_PASSWORD weaker than the password rule,
  // B-010) is logged and the seed goes on: before, it ended the whole seed,
  // so staging never got its demo data.
  try {
    const { created } = await ensureUser(prisma, betterAuth, {
      email: config.superadminEmail,
      password: config.superadminPassword,
      name: SUPERADMIN_NAME,
      username: 'superadmin',
      role: 'admin',
      emailVerified: true,
    });
    console.log(created ? 'Superadmin created' : 'Superadmin already exists');
  } catch (error) {
    console.error(
      'Superadmin could not be created — check SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD (min. 10 characters, a letter and a digit). Continuing with the rest of the seed.',
      error,
    );
  }

  if (!demoDataEnabled(process.env)) {
    console.log('Skipping demo data (SEED_DEMO_DATA).');
    return;
  }

  await seedDemo(prisma, betterAuth);
  await seedCommunity(prisma, betterAuth);
};
