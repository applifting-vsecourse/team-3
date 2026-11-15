/**
 * #236: checks the real BetterAuth behind `requireEmailVerification`, which
 * Jest can't load (ESM-only, see better-auth.provider.spec.ts). It runs our
 * `betterAuthCoreConfig` on BetterAuth's memory adapter, so it needs no
 * database and sends no e-mail. It captures the actual verification link and follows it through BetterAuth before signing in. Run it by hand after a BetterAuth upgrade or
 * a change to the auth config:
 *
 *   pnpm backend auth:check-email-verification
 *
 * It exits with 1 when any expectation fails.
 */
import { betterAuthCoreConfig } from '@/shared/auth/config/better-auth.config';
import {
  emailFlowOptions,
  withEmailFlows,
} from '@/shared/auth/config/email-flows';
import type { Config } from '@/shared/config/config.service';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { signJWT } from 'better-auth/crypto';

type Row = Record<string, unknown>;

const EMAIL = 'overeni@example.com';
const PASSWORD = 'hobbyhub2026';
const SECRET = 'auth-check-secret-auth-check-secret-0123';

const main = async (): Promise<void> => {
  const db: Record<string, Row[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const sent: Array<{ email: string; html: string }> = [];
  const flows = emailFlowOptions(
    { frontendUrl: 'http://localhost:5173' } as Config,
    {
      sendEmail: async (email, _subject, html) => {
        sent.push({ email, html });
      },
    },
  );
  const auth = betterAuth({
    ...withEmailFlows(betterAuthCoreConfig, flows),
    baseURL: 'http://localhost:4050',
    trustedOrigins: ['http://localhost:5173'],
    secret: SECRET,
    database: memoryAdapter(db),
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
        ageConfirmed: true,
        callbackURL: 'http://localhost:5173/email-overen?from=%2Fakce',
      } as never,
      asResponse: true,
    });
  const signIn = (password: string): Promise<Response> =>
    auth.api.signInEmail({
      body: { email: EMAIL, password },
      asResponse: true,
    });

  const underAge = await auth.handler(
    new Request('http://localhost:4050/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Ověření Testovací',
        email: EMAIL,
        password: PASSWORD,
        termsAccepted: true,
        privacyAcknowledged: true,
        ageConfirmed: false,
      }),
    }),
  );
  const underAgeBody = (await underAge.json()) as { code?: string };
  expect(
    'sign-up without age confirmation: 400, no account',
    underAge.status === 400 &&
      underAgeBody.code === 'AGE_CONFIRMATION_REQUIRED' &&
      db.user.length === 0,
    { status: underAge.status, code: underAgeBody.code },
  );

  const up = await signUp(PASSWORD);
  const upBody = (await up.json()) as { token?: unknown };
  expect(
    'sign-up: 200, token null, no cookie, no session, one e-mail',
    up.status === 200 &&
      upBody.token === null &&
      !up.headers.get('set-cookie') &&
      db.session.length === 0 &&
      sent.length === 1 &&
      Boolean(db.user.find((row) => row.email === EMAIL)?.ageConfirmedAt),
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

  const mail = sent[0];
  if (!mail) {
    console.error('No verification link was sent');
    process.exit(1);
  }
  const href = mail.html.match(/href="([^"]*\/verify-email\?[^"]+)"/)?.[1];
  if (!href) {
    console.error('Verification e-mail has no usable link');
    process.exit(1);
  }
  const link = new URL(href.replace(/&amp;/g, '&'));
  const invalid = new URL(link);
  invalid.searchParams.set('token', 'invalid');
  const rejected = await auth.handler(new Request(invalid));
  const rejectedLocation = new URL(
    rejected.headers.get('location') ?? '',
    'http://localhost:5173',
  );
  expect(
    'invalid token: redirects to the frontend with an error and no verification',
    rejected.status === 302 &&
      rejectedLocation.origin === 'http://localhost:5173' &&
      Boolean(rejectedLocation.searchParams.get('error')) &&
      !db.user.find((row) => row.email === EMAIL)?.emailVerified,
    {
      status: rejected.status,
      error: rejectedLocation.searchParams.get('error'),
    },
  );

  const expired = new URL(link);
  expired.searchParams.set(
    'token',
    await signJWT({ email: EMAIL }, SECRET, -60),
  );
  const expiredResponse = await auth.handler(new Request(expired));
  const expiredLocation = new URL(
    expiredResponse.headers.get('location') ?? '',
    'http://localhost:5173',
  );
  expect(
    'expired token: redirects with TOKEN_EXPIRED without verifying',
    expiredResponse.status === 302 &&
      expiredLocation.searchParams.get('error') === 'TOKEN_EXPIRED' &&
      !db.user.find((row) => row.email === EMAIL)?.emailVerified,
    {
      status: expiredResponse.status,
      error: expiredLocation.searchParams.get('error'),
    },
  );

  const unsafe = new URL(link);
  unsafe.searchParams.set('callbackURL', 'https://example.org/');
  const blocked = await auth.handler(new Request(unsafe));
  expect(
    'external callback: rejected without verifying',
    blocked.status === 403 &&
      !db.user.find((row) => row.email === EMAIL)?.emailVerified,
    { status: blocked.status },
  );

  const verification = await auth.handler(new Request(link));
  const location = new URL(
    verification.headers.get('location') ?? '',
    'http://localhost:5173',
  );
  expect(
    'verification link: verifies the actual account and redirects back',
    verification.status === 302 &&
      location.origin === 'http://localhost:5173' &&
      location.pathname === '/email-overen' &&
      location.searchParams.get('from') === '/akce' &&
      !location.searchParams.has('error') &&
      db.user.find((row) => row.email === EMAIL)?.emailVerified === true,
    {
      status: verification.status,
      path: location.pathname,
      error: location.searchParams.get('error'),
    },
  );
  const repeated = await auth.handler(new Request(link));
  expect(
    'replaying an already-used valid link is harmless',
    repeated.status === 302 &&
      db.user.find((row) => row.email === EMAIL)?.emailVerified === true,
    { status: repeated.status },
  );

  const verified = await signIn(PASSWORD);
  expect(
    'verified sign-in: 200 with a cookie and a session',
    verified.status === 200 &&
      Boolean(verified.headers.get('set-cookie')) &&
      db.session.length === 1,
    { status: verified.status, sessions: db.session.length },
  );

  const cookie = verified.headers.get('set-cookie')?.split(';')[0];
  const currentSession = cookie
    ? await auth.api.getSession({ headers: new Headers({ cookie }) })
    : null;
  expect(
    'signed-in session contains the age confirmation time',
    Boolean(
      (currentSession?.user as { ageConfirmedAt?: unknown } | undefined)
        ?.ageConfirmedAt,
    ),
    { found: Boolean(currentSession) },
  );

  // A Google-only account has a verified e-mail, but no password credential.
  // A failed password sign-in must not reveal whether that account exists.
  const existingUser = db.user.find((row) => row.email === EMAIL);
  if (!existingUser) throw new Error('Created user disappeared');
  db.user.push({
    ...existingUser,
    id: 'google-only-user',
    email: 'google-only@example.com',
  });
  db.account.push({
    id: 'google-only-account',
    userId: 'google-only-user',
    accountId: 'google-subject',
    providerId: 'google',
  });
  const googleOnly = await auth.api.signInEmail({
    body: { email: 'google-only@example.com', password: PASSWORD },
    asResponse: true,
  });
  const googleOnlyBody = (await googleOnly.json()) as { code?: string };
  expect(
    'Google-only account has no password: same 401 as bad credentials',
    googleOnly.status === 401 &&
      googleOnlyBody.code === 'INVALID_EMAIL_OR_PASSWORD' &&
      db.session.length === 1,
    { status: googleOnly.status, code: googleOnlyBody.code },
  );

  if (failures.length > 0) {
    console.error(`${failures.length} expectation(s) failed`);
    process.exit(1);
  }
  console.log('all expectations hold');
};

void main();
