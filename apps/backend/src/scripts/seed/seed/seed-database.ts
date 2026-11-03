import { PrismaService } from '@/core/prisma/prisma.service';
import { DEMO_PASSWORD } from '@/scripts/seed/data/demo-data';
import { passwordProblem } from '@/shared/auth/domain/password-policy';
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
 * Heslo demo účtů (N-3 z bezpečnostního auditu #172). Heslo v repu
 * (DEMO_PASSWORD) platí jen mimo produkci. Staging ho dostane z GitHub secretu
 * SEED_DEMO_PASSWORD (deploy.yml → Dockerfile.deploy). Null = demo data
 * nezakládat: v produkci chybí heslo, je stejné jako v repu, nebo neprojde
 * pravidly B-010 (s ním by registrace demo účtů spadla).
 */
export const demoPassword = (env: NodeJS.ProcessEnv): string | null => {
  const configured = env.SEED_DEMO_PASSWORD?.trim();
  if (!configured) return env.NODE_ENV === 'production' ? null : DEMO_PASSWORD;
  if (env.NODE_ENV === 'production' && configured === DEMO_PASSWORD) {
    return null;
  }
  return passwordProblem(configured) ? null : configured;
};

/**
 * Seed je opakovatelný: lokálně ho spouští každý `pnpm dev`, na stagingu každý start
 * kontejneru. Katalog a účty jen doplní, testovací data vymění jen při nové verzi.
 *
 * 1. Číselník aktivit a lokalit – vždy (aplikace bez něj nefunguje).
 * 2. Superadmin z SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD – když chybí.
 * 3. Testovací data: demo účty #47, komunita #150, proběhlé akce a hodnocení
 *    #180 (seed-content.ts). Mají verzi a při její změně se vymění (#181).
 *    V produkci jen se SEED_DEMO_DATA=true (staging ho má v Dockerfile.deploy)
 *    a s heslem ze SEED_DEMO_PASSWORD, ne s tím z repa (demoPassword, N-3).
 *    Jinde vypnout jde proměnnou SEED_DEMO_DATA=false.
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

  const password = demoPassword(process.env);
  if (!password) {
    console.error(
      "Skipping demo data: SEED_DEMO_PASSWORD is missing (production), the repo's password (production) or breaks the password rule (min. 10 characters, a letter and a digit).",
    );
    return;
  }

  await seedContent(prisma, betterAuth, password);
};
