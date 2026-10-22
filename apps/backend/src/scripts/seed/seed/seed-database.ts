import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { ensureUser } from './ensure-user';
import { seedCatalog } from './seed-catalog';
import { seedDemo } from './seed-demo';

/**
 * Seed je opakovatelný: lokálně ho spouští každý `pnpm dev`, na stagingu každý start
 * kontejneru. Nic nemaže a nic, co už v databázi je, nezakládá znovu.
 *
 * 1. Číselník aktivit a lokalit – vždy (aplikace bez něj nefunguje).
 * 2. Superadmin z SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD – když chybí.
 * 3. Testovací data #47 – vypnout jde proměnnou SEED_DEMO_DATA=false
 *    (např. v produkci, která zatím není).
 */
export const seedDatabase = async (
  prisma: PrismaService,
  config: Config,
  betterAuth: BetterAuth,
): Promise<void> => {
  await seedCatalog(prisma);

  // Superadmin. This should be deleted in a production app.
  const { created } = await ensureUser(prisma, betterAuth, {
    email: config.superadminEmail,
    password: config.superadminPassword,
    name: 'Admin (Delete in Prod)',
    username: 'superadmin',
    role: 'admin',
    emailVerified: true,
  });
  console.log(created ? 'Superadmin created' : 'Superadmin already exists');

  if (process.env.SEED_DEMO_DATA === 'false') {
    console.log('SEED_DEMO_DATA=false — skipping demo data.');
    return;
  }

  await seedDemo(prisma, betterAuth);
};
