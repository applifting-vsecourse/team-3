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

type Options = {
  plugins: { id: string }[];
  emailAndPassword: {
    requireEmailVerification?: boolean;
    autoSignIn?: boolean;
    sendResetPassword?: unknown;
  };
  emailVerification: {
    sendOnSignUp?: boolean;
    sendOnSignIn?: boolean;
    sendVerificationEmail?: unknown;
  };
};

const optionsFor = (config: Partial<Config>): Options => {
  const create = betterAuthProvider as {
    useFactory: (
      prisma: PrismaService,
      config: Config,
      email: EmailService,
    ) => Options;
  };
  return create.useFactory(
    {} as PrismaService,
    {
      backendUrl: 'https://api.hobbyhub.example',
      frontendUrl: 'https://hobbyhub.example',
      ...config,
    } as Config,
    { sendEmail: jest.fn() },
  );
};

const pluginIds = (config: Partial<Config>): string[] =>
  optionsFor(config).plugins.map((plugin) => plugin.id);

// BetterAuth itself is a black box (and ESM-only, out of Jest's reach): what
// is checked here is that the options it documents for this are set. With
// `requireEmailVerification` its /sign-in/email (and /sign-in/username) answer
// an unverified e-mail with 403 EMAIL_NOT_VERIFIED and make no session, and
// /sign-up/email returns `token: null` without setting a session cookie.
describe('betterAuthProvider: signing in needs a verified e-mail (#236)', () => {
  it('refuses e-mail + password sign-in until the e-mail is verified', () => {
    const { emailAndPassword } = optionsFor({ nodeEnv: 'production' });

    expect(emailAndPassword.requireEmailVerification).toBe(true);
    // the e-mail flows merged into the core config didn't drop it, nor the reset e-mail
    expect(emailAndPassword.sendResetPassword).toEqual(expect.any(Function));
    // and nothing turns automatic sign-in after sign-up back on
    expect(emailAndPassword.autoSignIn).not.toBe(true);
  });

  it('sends the link on sign-up, not on every refused sign-in', () => {
    const { emailVerification } = optionsFor({ nodeEnv: 'production' });

    expect(emailVerification.sendOnSignUp).toBe(true);
    expect(emailVerification.sendVerificationEmail).toEqual(
      expect.any(Function),
    );
    // a new link comes from „Poslat odkaz znovu“, which BetterAuth rate-limits
    expect(emailVerification.sendOnSignIn).toBeUndefined();
  });
});

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
