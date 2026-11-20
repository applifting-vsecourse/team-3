import { PrismaService } from '@/core/prisma/prisma.service';
import { DEMO_PASSWORD } from '@/scripts/seed/data/demo-data';
import { nameProblem } from '@/shared/auth/domain/name-policy';
import { passwordProblem } from '@/shared/auth/domain/password-policy';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { mock } from 'jest-mock-extended';
import { ensureUser } from './ensure-user';
import { seedCatalog } from './seed-catalog';
import { seedContent } from './seed-content';
import {
  demoDataEnabled,
  demoPassword,
  randomSuperadminPassword,
  seedDatabase,
  SUPERADMIN_NAME,
  superadminAccount,
} from './seed-database';

// Factories, so neither better-auth nor the test data load under Jest.
jest.mock('./ensure-user', () => ({ ensureUser: jest.fn() }));
jest.mock('./seed-catalog', () => ({ seedCatalog: jest.fn() }));
jest.mock('./seed-content', () => ({ seedContent: jest.fn() }));

const config = {
  superadminEmail: 'admin@example.com',
  superadminPassword: 'spravce-heslo-2026',
} as Config;

// SMTP set: e-mails really go out (staging since #165)
const smtp = {
  smtpHost: 'smtp.gmail.com',
  smtpUsername: 'hobbyhub@gmail.com',
  smtpPassword: 'app-password',
};
const production = { NODE_ENV: 'production' };

describe('superadminAccount (#308)', () => {
  describe('locally: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD from .env, as before', () => {
    it('takes the e-mail and password from the config', () => {
      expect(superadminAccount(config, {})).toEqual({
        ok: true,
        email: 'admin@example.com',
        password: 'spravce-heslo-2026',
        isPasswordRandom: false,
      });
    });

    it('says which variables are missing instead of failing on undefined', () => {
      for (const missing of [
        {},
        { superadminEmail: 'admin@example.com' },
        { superadminPassword: 'spravce-heslo-2026' },
        { superadminEmail: ' ', superadminPassword: 'spravce-heslo-2026' },
      ]) {
        expect(superadminAccount(missing, {})).toEqual({
          ok: false,
          problem: expect.stringContaining('SUPERADMIN_PASSWORD'),
        });
      }
    });

    it('refuses a password the sign-up would refuse (B-010)', () => {
      const weak = {
        superadminEmail: 'a@example.com',
        superadminPassword: 'kratke1',
      };
      expect(superadminAccount(weak, {}).ok).toBe(false);
    });

    it('never puts the password into the reason', () => {
      const account = superadminAccount(
        { superadminEmail: 'a@example.com', superadminPassword: 'tajne' },
        {},
      );
      expect(account.ok).toBe(false);
      expect(JSON.stringify(account)).not.toContain('tajne');
    });
  });

  describe('staging: only SUPERADMIN_EMAIL, a random password (review #380)', () => {
    it('with real e-mail: the e-mail and a password nobody knows', () => {
      expect(
        superadminAccount(
          { superadminEmail: ' admin@hobbyhub.cz ', ...smtp },
          production,
          () => 'nahodne-heslo-1',
        ),
      ).toEqual({
        ok: true,
        email: 'admin@hobbyhub.cz',
        password: 'nahodne-heslo-1',
        isPasswordRandom: true,
      });
    });

    it('never takes SUPERADMIN_PASSWORD, even when it is set', () => {
      const account = superadminAccount(
        { ...config, ...smtp },
        production,
        () => 'nahodne-heslo-1',
      );
      expect(account).toMatchObject({ password: 'nahodne-heslo-1' });
    });

    it('Resend counts as real e-mail too', () => {
      expect(
        superadminAccount(
          { superadminEmail: 'admin@hobbyhub.cz', resendApiKey: 're_x' },
          production,
        ).ok,
      ).toBe(true);
    });

    it('without SMTP (the simulated inbox) it is not created, and says why', () => {
      const account = superadminAccount(
        { superadminEmail: 'admin@hobbyhub.cz' },
        production,
      );
      expect(account).toEqual({
        ok: false,
        problem: expect.stringContaining('simulated inbox'),
      });
      // half the SMTP settings send nothing either
      expect(
        superadminAccount(
          { superadminEmail: 'admin@hobbyhub.cz', smtpHost: 'smtp.gmail.com' },
          production,
        ).ok,
      ).toBe(false);
    });

    it('without SUPERADMIN_EMAIL it names the GitHub variable', () => {
      expect(superadminAccount({ ...smtp }, production)).toEqual({
        ok: false,
        problem: expect.stringContaining('GitHub variable SUPERADMIN_EMAIL'),
      });
    });
  });
});

describe('randomSuperadminPassword (review #380)', () => {
  it('passes B-010 and is different every time', () => {
    const passwords = new Set(
      Array.from({ length: 20 }, () => randomSuperadminPassword()),
    );
    expect(passwords.size).toBe(20);
    for (const password of passwords) {
      expect(passwordProblem(password)).toBeNull();
      expect(password.length).toBeGreaterThanOrEqual(40);
    }
  });
});

describe('demoDataEnabled', () => {
  it('is on outside production unless switched off', () => {
    expect(demoDataEnabled({})).toBe(true);
    expect(demoDataEnabled({ SEED_DEMO_DATA: 'false' })).toBe(false);
  });

  it('in production needs SEED_DEMO_DATA=true: the passwords are in the repo', () => {
    expect(demoDataEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(
      demoDataEnabled({ NODE_ENV: 'production', SEED_DEMO_DATA: 'true' }),
    ).toBe(true);
  });
});

describe('demoPassword (N-3)', () => {
  const strong = 'staging-heslo-2026';

  it('outside production falls back to the password from the repo', () => {
    expect(demoPassword({})).toBe(DEMO_PASSWORD);
    expect(demoPassword({ SEED_DEMO_PASSWORD: strong })).toBe(strong);
  });

  it('in production takes only SEED_DEMO_PASSWORD, never the one from the repo', () => {
    expect(demoPassword({ NODE_ENV: 'production' })).toBeNull();
    expect(
      demoPassword({ NODE_ENV: 'production', SEED_DEMO_PASSWORD: '  ' }),
    ).toBeNull();
    expect(
      demoPassword({
        NODE_ENV: 'production',
        SEED_DEMO_PASSWORD: DEMO_PASSWORD,
      }),
    ).toBeNull();
    expect(
      demoPassword({ NODE_ENV: 'production', SEED_DEMO_PASSWORD: strong }),
    ).toBe(strong);
  });

  it('refuses a password the sign-up would refuse (B-010)', () => {
    expect(demoPassword({ SEED_DEMO_PASSWORD: 'kratke1' })).toBeNull();
    expect(
      demoPassword({ SEED_DEMO_PASSWORD: 'bezcislicekdekoli' }),
    ).toBeNull();
  });
});

describe('seedDatabase', () => {
  const prisma = mock<PrismaService>();
  const auth = mock<BetterAuth>();

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SEED_DEMO_DATA;
    delete process.env.SEED_DEMO_PASSWORD;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('seeds the demo data even when the superadmin cannot be created', async () => {
    jest.mocked(ensureUser).mockRejectedValue(new Error('Password too short'));

    await expect(seedDatabase(prisma, config, auth)).resolves.toBeUndefined();

    expect(seedCatalog).toHaveBeenCalled();
    expect(seedContent).toHaveBeenCalledWith(prisma, auth, DEMO_PASSWORD);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Superadmin could not be created'),
      expect.any(Error),
    );
  });

  it('without the superadmin variables skips the superadmin and seeds the rest (#308)', async () => {
    await seedDatabase(prisma, {} as Config, auth);

    expect(ensureUser).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Skipping the superadmin'),
    );
    expect(seedContent).toHaveBeenCalledWith(prisma, auth, DEMO_PASSWORD);
  });

  it("names the superadmin so that the sign-up's name rule lets it through (#153)", async () => {
    jest
      .mocked(ensureUser)
      .mockResolvedValue({ user: {} as never, created: true });

    await seedDatabase(prisma, config, auth);

    expect(ensureUser).toHaveBeenCalledWith(
      prisma,
      auth,
      expect.objectContaining({ name: SUPERADMIN_NAME, role: 'admin' }),
    );
    expect(nameProblem(SUPERADMIN_NAME)).toBeNull();
  });

  it('still skips the demo data with SEED_DEMO_DATA=false', async () => {
    process.env.SEED_DEMO_DATA = 'false';
    jest
      .mocked(ensureUser)
      .mockResolvedValue({ user: {} as never, created: false });

    await seedDatabase(prisma, config, auth);

    expect(seedContent).not.toHaveBeenCalled();
  });

  it('in production without SEED_DEMO_DATA=true seeds no test data', async () => {
    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest
      .mocked(ensureUser)
      .mockResolvedValue({ user: {} as never, created: false });

    try {
      await seedDatabase(prisma, config, auth);
    } finally {
      process.env.NODE_ENV = nodeEnv;
    }

    expect(seedContent).not.toHaveBeenCalled();
  });

  it('in production with SEED_DEMO_DATA=true but without SEED_DEMO_PASSWORD seeds no test data (N-3)', async () => {
    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.SEED_DEMO_DATA = 'true';
    jest
      .mocked(ensureUser)
      .mockResolvedValue({ user: {} as never, created: false });

    try {
      await seedDatabase(prisma, config, auth);
    } finally {
      process.env.NODE_ENV = nodeEnv;
    }

    expect(seedContent).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('SEED_DEMO_PASSWORD'),
    );
  });

  it('in production seeds the test data with SEED_DEMO_PASSWORD (N-3)', async () => {
    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.SEED_DEMO_DATA = 'true';
    process.env.SEED_DEMO_PASSWORD = 'staging-heslo-2026';
    jest
      .mocked(ensureUser)
      .mockResolvedValue({ user: {} as never, created: false });

    try {
      await seedDatabase(prisma, config, auth);
    } finally {
      process.env.NODE_ENV = nodeEnv;
    }

    expect(seedContent).toHaveBeenCalledWith(
      prisma,
      auth,
      'staging-heslo-2026',
    );
  });

  describe('staging: the superadmin with a random password (review #380)', () => {
    const stagingConfig = {
      superadminEmail: 'admin@hobbyhub.cz',
      ...smtp,
    } as Config;
    const inProduction = async (run: () => Promise<void>): Promise<void> => {
      const nodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await run();
      } finally {
        process.env.NODE_ENV = nodeEnv;
      }
    };
    const logged = (): string =>
      JSON.stringify([
        ...jest.mocked(console.log).mock.calls,
        ...jest.mocked(console.error).mock.calls,
      ]);

    it('a new superadmin: created as admin with a random password, which is never logged', async () => {
      jest.mocked(ensureUser).mockResolvedValue({
        user: { role: 'admin' } as never,
        created: true,
      });

      await inProduction(() => seedDatabase(prisma, stagingConfig, auth));

      expect(ensureUser).toHaveBeenCalledWith(
        prisma,
        auth,
        expect.objectContaining({
          email: 'admin@hobbyhub.cz',
          role: 'admin',
          emailVerified: true,
        }),
      );
      const { password } = jest.mocked(ensureUser).mock.calls[0]![2];
      expect(passwordProblem(password)).toBeNull();
      expect(logged()).not.toContain(password);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('„Zapomenuté heslo“'),
      );
    });

    it('an existing superadmin: kept as it is, its password too', async () => {
      // ensureUser returns an account with a username untouched (ensure-user.spec)
      jest.mocked(ensureUser).mockResolvedValue({
        user: { role: 'admin' } as never,
        created: false,
      });

      await inProduction(() => seedDatabase(prisma, stagingConfig, auth));

      expect(console.log).toHaveBeenCalledWith('Superadmin already exists');
    });

    it('an existing regular account with that e-mail: not made the superadmin, and the log says so', async () => {
      jest.mocked(ensureUser).mockResolvedValue({
        user: { role: 'user' } as never,
        created: false,
      });

      await inProduction(() => seedDatabase(prisma, stagingConfig, auth));

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('existing regular account'),
      );
    });

    it('without SMTP: no superadmin, and the log says why', async () => {
      await inProduction(() =>
        seedDatabase(
          prisma,
          { superadminEmail: 'admin@hobbyhub.cz' } as Config,
          auth,
        ),
      );

      expect(ensureUser).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Skipping the superadmin'),
      );
      expect(logged()).toContain('simulated inbox');
    });
  });

  it('seeds the test data after the catalog: it needs the activities and localities', async () => {
    jest
      .mocked(ensureUser)
      .mockResolvedValue({ user: {} as never, created: false });

    await seedDatabase(prisma, config, auth);

    expect(jest.mocked(seedCatalog).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(seedContent).mock.invocationCallOrder[0],
    );
  });
});
