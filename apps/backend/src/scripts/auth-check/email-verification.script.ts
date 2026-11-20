/**
 * #236: checks the real BetterAuth behind `requireEmailVerification`, which
 * Jest can't load (ESM-only, see better-auth.provider.spec.ts). It runs our
 * `betterAuthCoreConfig` on BetterAuth's memory adapter, so it needs no
 * database and sends no e-mail. It follows the actual verification link before
 * signing in. CI and check-all run it automatically; to run it separately:
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
import { SIGN_UP_CONSENT } from '@/shared/auth/domain/consent';
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
    {
      frontendUrl: 'http://localhost:5173',
      frontendResetPasswordUrl: 'reset-password',
    } as Config,
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
        callbackURL: 'http://localhost:5173/email-overen?from=%2Fakce',
        password,
        ...SIGN_UP_CONSENT,
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

  const mail = sent[0];
  if (!mail) {
    throw new Error('No verification link was sent');
  }
  const href = mail.html.match(/href="([^"]*\/verify-email\?[^"]+)"/)?.[1];
  if (!href) {
    throw new Error('Verification e-mail has no usable link');
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

  // Synthetic expired JWT depends on BetterAuth internals; recheck after upgrades.
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
      !new URL(
        repeated.headers.get('location') ?? '',
        'http://localhost:5173',
      ).searchParams.has('error') &&
      db.user.find((row) => row.email === EMAIL)?.emailVerified === true,
    { status: repeated.status },
  );

  // Verification may already have created a session (#300).
  const sessionsBeforePasswordSignIn = db.session.length;
  const verified = await signIn(PASSWORD);
  expect(
    'verified sign-in: 200 with a cookie and a session',
    verified.status === 200 &&
      Boolean(verified.headers.get('set-cookie')) &&
      db.session.length === sessionsBeforePasswordSignIn + 1,
    { status: verified.status, sessions: db.session.length },
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
  const sessionsBeforeGoogle = db.session.length;
  const googleOnly = await auth.api.signInEmail({
    body: { email: 'google-only@example.com', password: PASSWORD },
    asResponse: true,
  });
  const googleOnlyBody = (await googleOnly.json()) as { code?: string };
  expect(
    'Google-only account has no password: same 401 as bad credentials',
    googleOnly.status === 401 &&
      googleOnlyBody.code === 'INVALID_EMAIL_OR_PASSWORD' &&
      db.session.length === sessionsBeforeGoogle,
    { status: googleOnly.status, code: googleOnlyBody.code },
  );

  const googleSignup = await auth.api.signUpEmail({
    body: {
      name: 'Google Test',
      email: 'google-only@example.com',
      password: PASSWORD,
      ...SIGN_UP_CONSENT,
    } as never,
    asResponse: true,
  });
  expect(
    'Google-only duplicate signup appears successful without adding a password',
    googleSignup.status === 200 &&
      !db.account.some(
        (row) =>
          row.userId === 'google-only-user' && row.providerId === 'credential',
      ),
    { status: googleSignup.status },
  );

  const requestResetLink = async (email: string): Promise<URL> => {
    const previousCount = sent.length;
    const reset = await auth.api.requestPasswordReset({
      body: { email },
      asResponse: true,
    });
    const resetMail = sent[previousCount];
    const resetHref = resetMail?.html.match(
      /href="([^"\s]*\/reset-password\/[^"\s]+)"/,
    )?.[1];
    if (
      reset.status !== 200 ||
      sent.length !== previousCount + 1 ||
      resetMail?.email !== email ||
      !resetHref
    ) {
      throw new Error('Password reset e-mail has no usable link');
    }
    return new URL(resetHref.replace(/&amp;/g, '&'));
  };
  const openResetLink = async (link: URL): Promise<URL> => {
    const response = await auth.handler(new Request(link));
    const location = new URL(response.headers.get('location') ?? '', link);
    if (
      response.status !== 302 ||
      location.origin !== 'http://localhost:5173' ||
      location.pathname !== '/reset-password'
    ) {
      throw new Error('Password reset link did not open the configured page');
    }
    return location;
  };
  const tokenFromLink = async (link: URL): Promise<string> => {
    const location = await openResetLink(link);
    const token = location.searchParams.get('token');
    if (!token || location.searchParams.has('error')) {
      throw new Error('Valid password reset link did not open the form');
    }
    return token;
  };

  const resetToken = await tokenFromLink(
    await requestResetLink('google-only@example.com'),
  );
  const changed = await auth.api.resetPassword({
    body: { token: resetToken, newPassword: PASSWORD },
    asResponse: true,
  });
  const afterReset = await auth.api.signInEmail({
    body: { email: 'google-only@example.com', password: PASSWORD },
    asResponse: true,
  });
  expect(
    'Google-only account can set a password through reset and then sign in',
    changed.status === 200 &&
      afterReset.status === 200 &&
      Boolean(afterReset.headers.get('set-cookie')),
    { changed: changed.status, signIn: afterReset.status },
  );

  const credentialLink = await requestResetLink(EMAIL);
  const credentialToken = await tokenFromLink(credentialLink);
  const newPassword = 'nove-heslo-2026';
  const changedCredential = await auth.api.resetPassword({
    body: { token: credentialToken, newPassword },
    asResponse: true,
  });
  const remainingSessions = db.session.filter(
    (session) => session.userId === existingUser.id,
  ).length;
  const oldSignIn = await signIn(PASSWORD);
  const newSignIn = await signIn(newPassword);
  expect(
    'e-mail account reset revokes past sessions and allows only the new password',
    changedCredential.status === 200 &&
      remainingSessions === 0 &&
      oldSignIn.status === 401 &&
      newSignIn.status === 200 &&
      Boolean(newSignIn.headers.get('set-cookie')),
    {
      oldSignIn: oldSignIn.status,
      newSignIn: newSignIn.status,
      remainingSessions,
    },
  );

  const usedLocation = await openResetLink(credentialLink);
  expect(
    'used reset link redirects to the error page before asking for a password',
    usedLocation.searchParams.get('error') === 'INVALID_TOKEN' &&
      !usedLocation.searchParams.has('token'),
    { error: usedLocation.searchParams.get('error') },
  );

  const expiringLink = await requestResetLink(EMAIL);
  const expiringToken = await tokenFromLink(expiringLink);
  const verificationRow = db.verification.find(
    (row) => row.identifier === `reset-password:${expiringToken}`,
  );
  if (!verificationRow)
    throw new Error('Reset verification row was not created');
  verificationRow.expiresAt = new Date(Date.now() - 1000);
  const expiredResetLocation = await openResetLink(expiringLink);
  expect(
    'expired reset link redirects to the error page before asking for a password',
    expiredResetLocation.searchParams.get('error') === 'INVALID_TOKEN' &&
      !expiredResetLocation.searchParams.has('token'),
    { error: expiredResetLocation.searchParams.get('error') },
  );

  if (failures.length > 0) {
    throw new Error(`${failures.length} expectation(s) failed`);
  }
  console.log('all expectations hold');
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
