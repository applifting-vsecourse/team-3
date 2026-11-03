import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { ensureUser } from './ensure-user';
import { seedCatalog } from './seed-catalog';
import { seedContent } from './seed-content';

/** Passes the sign-up's name rule (#153): no brackets, unlike the template's. */
export const SUPERADMIN_NAME = 'Správce HobbyHubu';

export const demoDataEnabled = (env: NodeJS.ProcessEnv): boolean => {
  if (env.SEED_DEMO_DATA === 'true') return true;
  if (env.SEED_DEMO_DATA === 'false') return false;
  return env.NODE_ENV !== 'production';
};

/**
 * Seed je opakovatelný: lokálně ho spouští každý `pnpm dev`, na stagingu každý start
 * kontejneru. Katalog a účty jen doplní, testovací data vymění jen při nové verzi.
 *
 * 1. Číselník aktivit a lokalit – vždy (aplikace bez něj nefunguje).
 * 2. Superadmin z SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD – když chybí.
 * 3. Testovací data: demo účty #47, komunita #150 s akcemi krajských měst,
 *    akce skupin, proběhlé akce a hodnocení #180 a #181 (seed-content.ts).
 *    Mají verzi a při její změně se vymění (#181). Jejich hesla jsou v repu, takže v produkci jen se SEED_DEMO_DATA=true
 *    (staging ho má v Dockerfile.deploy). Jinde vypnout jde proměnnou
 *    SEED_DEMO_DATA=false.
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

  await seedContent(prisma, betterAuth);
};
