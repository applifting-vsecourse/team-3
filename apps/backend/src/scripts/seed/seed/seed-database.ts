import { randomBytes } from 'crypto';
import { sendsRealEmail } from '@/core/email/simulated-inbox/simulated-inbox-enabled';
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

export type SuperadminAccount =
  | {
      ok: true;
      email: string;
      password: string;
      /** Production: a random password nobody knows; set via „Zapomenuté heslo“. */
      isPasswordRandom: boolean;
    }
  | { ok: false; problem: string };

/**
 * A password nobody knows, kept nowhere and never logged (#308, review
 * #380): 256 random bits, plus a letter and a digit for B-010's rule.
 */
export const randomSuperadminPassword = (): string =>
  `${randomBytes(32).toString('base64url')}a1`;

/**
 * Účet superadmina, jak ho seed založí, nebo proč ho nezaloží (#308).
 *
 * Na stagingu (produkce) jen ze SUPERADMIN_EMAIL (GitHub variable) a
 * s náhodným heslem, které se nikde neuloží; heslo si superadmin nastaví přes
 * „Zapomenuté heslo“. V image tak není heslo ani jeho hash (review #380).
 * Odkaz pro nové heslo dokládá vlastnictví adresy jen se skutečným e-mailem
 * (SMTP nebo Resend), proto bez něj (simulovaná schránka) seed superadmina
 * nezaloží. Lokálně ze SUPERADMIN_EMAIL a SUPERADMIN_PASSWORD z `.env` jako
 * dřív. Hláška nikdy neobsahuje heslo.
 */
export const superadminAccount = (
  config: Pick<
    Config,
    | 'superadminEmail'
    | 'superadminPassword'
    | 'resendApiKey'
    | 'smtpHost'
    | 'smtpUsername'
    | 'smtpPassword'
  >,
  env: NodeJS.ProcessEnv,
  randomPassword: () => string = randomSuperadminPassword,
): SuperadminAccount => {
  const email = config.superadminEmail?.trim();
  if (env.NODE_ENV === 'production') {
    if (!email) {
      return {
        ok: false,
        problem:
          'SUPERADMIN_EMAIL is not set (on staging: the GitHub variable SUPERADMIN_EMAIL, passed in by deploy.yml).',
      };
    }
    if (!sendsRealEmail(config)) {
      return {
        ok: false,
        problem:
          "e-mails don't really go out (no SMTP nor Resend: the simulated inbox). The superadmin sets the password with „Zapomenuté heslo“, which needs a real e-mail to prove the address is theirs.",
      };
    }
    return {
      ok: true,
      email,
      password: randomPassword(),
      isPasswordRandom: true,
    };
  }

  const password = config.superadminPassword;
  if (!email || !password?.trim()) {
    return {
      ok: false,
      problem:
        'SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD is not set (apps/backend/.env).',
    };
  }
  const problem = passwordProblem(password);
  if (problem) {
    return {
      ok: false,
      problem: `SUPERADMIN_PASSWORD breaks the password rule (B-010): ${problem}`,
    };
  }
  return { ok: true, email, password, isPasswordRandom: false };
};

/**
 * Seed je opakovatelný: lokálně ho spouští každý `pnpm dev`, na stagingu každý start
 * kontejneru. Katalog a účty jen doplní, testovací data vymění jen při nové verzi.
 *
 * 1. Číselník aktivit a lokalit – vždy (aplikace bez něj nefunguje).
 * 2. Superadmin – když chybí. Lokálně ze SUPERADMIN_EMAIL a SUPERADMIN_PASSWORD,
 *    na stagingu jen ze SUPERADMIN_EMAIL s náhodným heslem, které si nastaví
 *    přes „Zapomenuté heslo“ (superadminAccount). Existující účet se stejným
 *    e-mailem nepovýší a heslo mu nemění.
 * 3. Testovací data: demo účty #47, komunita #150 s akcemi krajských měst,
 *    akce skupin, proběhlé akce a hodnocení #180 a #181 (seed-content.ts).
 *    Mají verzi a při její změně se vymění (#181). V produkci jen se
 *    SEED_DEMO_DATA=true (staging ho má v Dockerfile.deploy) a s heslem ze
 *    SEED_DEMO_PASSWORD, ne s tím z repa (demoPassword, N-3). Jinde vypnout
 *    jde proměnnou SEED_DEMO_DATA=false.
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
  const superadmin = superadminAccount(config, process.env);
  if (!superadmin.ok) {
    console.error(`Skipping the superadmin: ${superadmin.problem}`);
  } else {
    try {
      // an existing account keeps its password and role, the superadmin too
      const { user, created } = await ensureUser(prisma, betterAuth, {
        email: superadmin.email,
        password: superadmin.password,
        name: SUPERADMIN_NAME,
        username: 'superadmin',
        role: 'admin',
        emailVerified: true,
      });
      if (user.role !== 'admin') {
        console.error(
          `Skipping the superadmin: ${superadmin.email} is an existing regular account; it is not made the superadmin. Use another SUPERADMIN_EMAIL.`,
        );
      } else if (created && superadmin.isPasswordRandom) {
        console.log(
          `Superadmin created: ${superadmin.email} sets the password with „Zapomenuté heslo“ (the seed keeps none).`,
        );
      } else {
        console.log(
          created ? 'Superadmin created' : 'Superadmin already exists',
        );
      }
    } catch (error) {
      console.error(
        'Superadmin could not be created — check SUPERADMIN_EMAIL (and SUPERADMIN_PASSWORD locally: min. 10 characters, a letter and a digit). Continuing with the rest of the seed.',
        error,
      );
    }
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
