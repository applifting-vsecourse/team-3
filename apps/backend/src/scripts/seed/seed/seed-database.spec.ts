import { PrismaService } from '@/core/prisma/prisma.service';
import { nameProblem } from '@/shared/auth/domain/name-policy';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { mock } from 'jest-mock-extended';
import { ensureUser } from './ensure-user';
import { seedCatalog } from './seed-catalog';
import { seedCommunity } from './seed-community';
import { seedDatabase, SUPERADMIN_NAME } from './seed-database';
import { seedDemo } from './seed-demo';

// Factories, so neither better-auth nor the demo and community data load under Jest.
jest.mock('./ensure-user', () => ({ ensureUser: jest.fn() }));
jest.mock('./seed-catalog', () => ({ seedCatalog: jest.fn() }));
jest.mock('./seed-demo', () => ({ seedDemo: jest.fn() }));
jest.mock('./seed-community', () => ({ seedCommunity: jest.fn() }));

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
    expect(seedCommunity).toHaveBeenCalledWith(prisma, auth);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Superadmin could not be created'),
      expect.any(Error),
    );
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

    expect(seedDemo).not.toHaveBeenCalled();
    expect(seedCommunity).not.toHaveBeenCalled();
  });

  it('adds the community after the demo data, not before', async () => {
    jest
      .mocked(ensureUser)
      .mockResolvedValue({ user: {} as never, created: false });

    await seedDatabase(prisma, config, auth);

    // the demo seed only fills an empty database: the community must come second
    expect(jest.mocked(seedDemo).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(seedCommunity).mock.invocationCallOrder[0],
    );
  });
});
