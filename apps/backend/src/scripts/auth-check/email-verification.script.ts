/**
 * #236: checks the real BetterAuth behind `requireEmailVerification`, which
 * Jest can't load (ESM-only, see better-auth.provider.spec.ts). It runs our
 * `betterAuthCoreConfig` on BetterAuth's memory adapter, so it needs no
 * database and sends no e-mail. Run it by hand after a BetterAuth upgrade or
 * a change to the auth config:
 *
 *   pnpm backend auth:check-email-verification
 *
 * It exits with 1 when any expectation fails.
 */
import { betterAuthCoreConfig } from '@/shared/auth/config/better-auth.config';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';

type Row = Record<string, unknown>;

const EMAIL = 'overeni@example.com';
const PASSWORD = 'hobbyhub2026';

const main = async (): Promise<void> => {
  const db: Record<string, Row[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const sent: string[] = [];
  const auth = betterAuth({
    ...betterAuthCoreConfig,
    baseURL: 'http://localhost:4050',
    secret: 'auth-check-secret-auth-check-secret-0123',
    database: memoryAdapter(db),
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user }) => {
        sent.push(user.email);
      },
    },
    rateLimit: { enabled: false },
  });

  const failures: string[] = [];
  const expect = (label: string, ok: boolean, detail: unknown): void => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`, detail);
    if (!ok) failures.push(label);
  };
  const signUp = (password: string): Promise<Response> =>
    auth.api.signUpEmail({
      body: {
        name: 'Ověření Testovací',
        email: EMAIL,
        password,
        termsAccepted: true,
        privacyAcknowledged: true,
      } as never,
      asResponse: true,
    });
  const signIn = (password: string): Promise<Response> =>
    auth.api.signInEmail({
      body: { email: EMAIL, password },
      asResponse: true,
    });

  const up = await signUp(PASSWORD);
  const upBody = (await up.json()) as { token?: unknown };
  expect(
    'sign-up: 200, token null, no cookie, no session, one e-mail',
    up.status === 200 &&
      upBody.token === null &&
      !up.headers.get('set-cookie') &&
      db.session.length === 0 &&
      sent.length === 1,
    { status: up.status, token: upBody.token, sessions: db.session.length },
  );

  const dup = await signUp('jineheslo2026');
  expect(
    'sign-up of an existing address: the same 200, no session',
    dup.status === 200 && db.session.length === 0,
    { status: dup.status, sessions: db.session.length },
  );

  const unverified = await signIn(PASSWORD);
  const unverifiedBody = (await unverified.json()) as { code?: string };
  expect(
    'unverified sign-in: 403 EMAIL_NOT_VERIFIED, no session',
    unverified.status === 403 &&
      unverifiedBody.code === 'EMAIL_NOT_VERIFIED' &&
      db.session.length === 0,
    { status: unverified.status, code: unverifiedBody.code },
  );

  const wrong = await signIn('spatneheslo2026');
  expect('wrong password: 401', wrong.status === 401, { status: wrong.status });

  const user = db.user.find((row) => row.email === EMAIL);
  if (user) user.emailVerified = true;
  const verified = await signIn(PASSWORD);
  expect(
    'verified sign-in: 200 with a cookie and a session',
    verified.status === 200 &&
      Boolean(verified.headers.get('set-cookie')) &&
      db.session.length === 1,
    { status: verified.status, sessions: db.session.length },
  );

  if (failures.length > 0) {
    console.error(`${failures.length} expectation(s) failed`);
    process.exit(1);
  }
  console.log('all expectations hold');
};

void main();
