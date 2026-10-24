import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { mock } from 'jest-mock-extended';
import { ensureUser } from './ensure-user';
import { seedCatalog } from './seed-catalog';
import { seedDatabase } from './seed-database';
import { seedDemo } from './seed-demo';

// Factories, so neither better-auth nor the demo data load under Jest.
jest.mock('./ensure-user', () => ({ ensureUser: jest.fn() }));
jest.mock('./seed-catalog', () => ({ seedCatalog: jest.fn() }));
jest.mock('./seed-demo', () => ({ seedDemo: jest.fn() }));

const config = {
  superadminEmail: 'admin@example.com',
  superadminPassword: 'short',
} as Config;

describe('seedDatabase', () => {
  const prisma = mock<PrismaService>();
  const auth = mock<BetterAuth>();

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SEED_DEMO_DATA;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('seeds the demo data even when the superadmin cannot be created', async () => {
    jest.mocked(ensureUser).mockRejectedValue(new Error('Password too short'));

    await expect(seedDatabase(prisma, config, auth)).resolves.toBeUndefined();

    expect(seedCatalog).toHaveBeenCalled();
    expect(seedDemo).toHaveBeenCalledWith(prisma, auth);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Superadmin could not be created'),
      expect.any(Error),
    );
  });

  it('still skips the demo data with SEED_DEMO_DATA=false', async () => {
    process.env.SEED_DEMO_DATA = 'false';
    jest
      .mocked(ensureUser)
      .mockResolvedValue({ user: {} as never, created: false });

    await seedDatabase(prisma, config, auth);

    expect(seedDemo).not.toHaveBeenCalled();
  });
});
