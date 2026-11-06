import type { EmailService } from '@/core/email/interfaces/email-service.interface';
import type { PrismaService } from '@/core/prisma/prisma.service';
import type { Config } from '@/shared/config/config.service';
import { betterAuthProvider } from './better-auth.provider';

// better-auth is ESM-only, which Jest can't load: betterAuth() hands back the
// options it was given, and each plugin is a stand-in with the real one's id.
jest.mock('better-auth', () => ({
  betterAuth: (options: unknown): unknown => options,
}));
jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: (): string => 'prisma-adapter',
}));
jest.mock('better-auth/api', () => ({
  createAuthMiddleware: (hook: unknown): unknown => hook,
  APIError: class extends Error {},
}));
jest.mock('better-auth/plugins', () => ({
  openAPI: (): object => ({ id: 'open-api' }),
  username: (): object => ({ id: 'username' }),
  haveIBeenPwned: (): object => ({ id: 'have-i-been-pwned' }),
}));
jest.mock('@/core/email/render', () => ({ renderEmail: jest.fn() }));

const pluginIds = (config: Partial<Config>): string[] => {
  const create = betterAuthProvider as {
    useFactory: (
      prisma: PrismaService,
      config: Config,
      email: EmailService,
    ) => { plugins: { id: string }[] };
  };
  const options = create.useFactory(
    {} as PrismaService,
    {
      backendUrl: 'https://api.hobbyhub.example',
      frontendUrl: 'https://hobbyhub.example',
      ...config,
    } as Config,
    { sendEmail: jest.fn() },
  );
  return options.plugins.map((plugin) => plugin.id);
};

describe('betterAuthProvider: the reference page (N-9)', () => {
  it('adds openAPI() outside production', () => {
    expect(pluginIds({ nodeEnv: 'development' })).toContain('open-api');
  });

  it('leaves openAPI() out in production without API_DOCS=true', () => {
    expect(pluginIds({ nodeEnv: 'production' })).not.toContain('open-api');
    expect(
      pluginIds({ nodeEnv: 'production', apiDocs: 'false' }),
    ).not.toContain('open-api');
  });

  it('adds openAPI() in production with API_DOCS=true (staging)', () => {
    expect(pluginIds({ nodeEnv: 'production', apiDocs: 'true' })).toContain(
      'open-api',
    );
  });

  it('keeps the other plugins either way', () => {
    expect(pluginIds({ nodeEnv: 'production' })).toEqual(
      expect.arrayContaining(['username', 'have-i-been-pwned']),
    );
  });
});
