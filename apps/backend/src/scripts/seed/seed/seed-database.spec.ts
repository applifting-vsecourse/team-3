import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '@/core/prisma/prisma.service';
import { DEMO_PASSWORD } from '@/scripts/seed/data/demo-data';
import { nameProblem } from '@/shared/auth/domain/name-policy';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { mock } from 'jest-mock-extended';
import { ensureUser } from './ensure-user';
import { seedCatalog } from './seed-catalog';
import { seedContent } from './seed-content';
import {
  demoDataEnabled,
  demoPassword,
  EXAMPLE_SUPERADMIN_PASSWORD,
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

describe('superadminAccount (#308)', () => {
  const production = { NODE_ENV: 'production' };

  it('takes the e-mail and password from the config', () => {
    expect(superadminAccount(config, production)).toEqual({
      ok: true,
      email: 'admin@example.com',
      password: 'spravce-heslo-2026',
    });
  });

  it('says which variables are missing instead of failing on undefined', () => {
    for (const missing of [
      {},
      { superadminEmail: 'admin@example.com' },
      { superadminPassword: 'spravce-heslo-2026' },
      { superadminEmail: ' ', superadminPassword: 'spravce-heslo-2026' },
    ]) {
      const account = superadminAccount(missing, production);
      expect(account).toEqual({
        ok: false,
        problem: expect.stringContaining('SUPERADMIN_PASSWORD'),
      });
    }
  });

  it("in production refuses the password from .env.example, it's in the repo", () => {
    const example = {
      superadminEmail: 'admin@example.com',
      superadminPassword: EXAMPLE_SUPERADMIN_PASSWORD,
    };
    expect(superadminAccount(example, production).ok).toBe(false);
    expect(superadminAccount(example, {}).ok).toBe(true);
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

  it('knows the password that .env.example sets', () => {
    const example = readFileSync(
      join(__dirname, '../../../../.env.example'),
      'utf8',
    );
    expect(example).toContain(
      `SUPERADMIN_PASSWORD=${EXAMPLE_SUPERADMIN_PASSWORD}\n`,
    );
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
