/** #300: real BetterAuth + production email options, no database or real mail. */
import { strict as assert } from 'node:assert';
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
const SECRET = 'verification-link-test-secret-0123456789012345';
const PASSWORD = 'hobbyhub2026';
const CALLBACK = 'http://localhost:5173/email-overen?from=%2Fmoje%2Fakce';
const check = (label: string, condition: unknown): void => {
  assert(condition, label);
  console.log(`ok  ${label}`);
};
const cookies = (response: Response): Headers =>
  new Headers({
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; '),
  });
const linkFrom = (html: string): URL => {
  const href = html.match(/href="([^"]*\/verify-email\?[^"]+)"/)?.[1];
  assert(href, 'Rendered email contains the verification link');
  return new URL(href.replace(/&amp;/g, '&'));
};

async function main(): Promise<void> {
  const db: Record<string, Row[]> = {
    user: [],
    account: [],
    session: [],
    verification: [],
  };
  const sent: Array<{ email: string; html: string }> = [];
  const auth = betterAuth({
    ...withEmailFlows(
      betterAuthCoreConfig,
      emailFlowOptions({ frontendUrl: 'http://localhost:5173' } as Config, {
        sendEmail: async (email, _subject, html) => {
          sent.push({ email, html });
        },
      }),
    ),
    baseURL: 'http://localhost:4050',
    trustedOrigins: ['http://localhost:5173'],
    secret: SECRET,
    database: memoryAdapter(db),
    rateLimit: { enabled: false },
  });
  const signup = (email: string): Promise<Response> =>
    auth.api.signUpEmail({
      body: {
        name: 'Ověření Test',
        email,
        password: PASSWORD,
        callbackURL: CALLBACK,
        ...SIGN_UP_CONSENT,
      } as never,
      asResponse: true,
    });
  const email = 'verification-link@example.com';
  const registered = await signup(email);
  check(
    'registration has no cookie or session before verification',
    registered.status === 200 &&
      !registered.headers.has('set-cookie') &&
      db.session.length === 0,
  );
  const link = linkFrom(sent[0]!.html);
  check(
    'email preserves the frontend callback and origin page',
    link.searchParams.get('callbackURL') === CALLBACK,
  );
  const blocked = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  check(
    'unverified password sign-in has no session',
    blocked.status === 403 && db.session.length === 0,
  );

  // A deliberately expired synthetic JWT; recheck its format on BetterAuth upgrades.
  for (const [label, token, code] of [
    ['invalid', 'broken', 'INVALID_TOKEN'],
    ['expired', await signJWT({ email }, SECRET, -60), 'TOKEN_EXPIRED'],
  ]) {
    const bad = new URL(link);
    bad.searchParams.set('token', token!);
    const response = await auth.handler(new Request(bad));
    check(
      `${label} link redirects with a reason and creates no session`,
      response.status === 302 &&
        new URL(response.headers.get('location')!).searchParams.get('error') ===
          code &&
        !response.headers.has('set-cookie') &&
        db.session.length === 0,
    );
  }
  const unsafe = new URL(link);
  unsafe.searchParams.set('callbackURL', 'https://example.org/');
  const rejected = await auth.handler(new Request(unsafe));
  check(
    'external callback cannot verify or sign in',
    rejected.status === 403 &&
      db.session.length === 0 &&
      !db.user.find((row) => row.email === email)?.emailVerified,
  );

  const resend = await auth.api.sendVerificationEmail({
    body: { email, callbackURL: CALLBACK },
    asResponse: true,
  });
  check(
    'a new verification link can be requested without a session',
    resend.status === 200 && sent.length === 2,
  );
  const verified = await auth.handler(new Request(linkFrom(sent[1]!.html)));
  const destination = new URL(verified.headers.get('location')!);
  const session = await auth.api.getSession({ headers: cookies(verified) });
  check(
    'first valid verification sets a cookie and signs in the link account',
    verified.status === 302 &&
      verified.headers.has('set-cookie') &&
      session?.user.email === email &&
      session.user.emailVerified &&
      db.session.length === 1,
  );
  check(
    'verification returns to the requested frontend destination without an error',
    destination.origin === 'http://localhost:5173' &&
      destination.pathname === '/email-overen' &&
      destination.searchParams.get('from') === '/moje/akce' &&
      !destination.searchParams.has('error'),
  );

  const beforeReplay = db.session.length;
  const replay = await auth.handler(new Request(link));
  check(
    'an already-used link does not create a new authenticated session',
    replay.status === 302 &&
      !replay.headers.has('set-cookie') &&
      db.session.length === beforeReplay,
  );

  const nextEmail = 'another-verification@example.com';
  await signup(nextEmail);
  const nextLink = linkFrom(sent[sent.length - 1]!.html);
  const beforeInvalid = db.session.length;
  const invalidWithSession = new URL(nextLink);
  invalidWithSession.searchParams.set('token', 'broken');
  const failed = await auth.handler(
    new Request(invalidWithSession, { headers: cookies(verified) }),
  );
  const kept = await auth.api.getSession({ headers: cookies(verified) });
  check(
    'invalid link leaves the current account signed in and unchanged',
    failed.status === 302 &&
      !failed.headers.has('set-cookie') &&
      kept?.user.email === email &&
      db.session.length === beforeInvalid,
  );
  const switched = await auth.handler(
    new Request(nextLink, { headers: cookies(verified) }),
  );
  const switchedSession = await auth.api.getSession({
    headers: cookies(switched),
  });
  check(
    'a valid new-account link replaces another account cookie with the verified account',
    switchedSession?.user.email === nextEmail &&
      switchedSession.user.emailVerified &&
      switchedSession.user.id !== session?.user.id,
  );

  const newEmail = 'changed-verification@example.com';
  const change = await auth.api.changeEmail({
    body: {
      newEmail,
      callbackURL: 'http://localhost:5173/email-overen?from=%2Fprofil',
    },
    headers: cookies(switched),
    asResponse: true,
  });
  check(
    'changing email sends a verification link and keeps the old email until it is used',
    change.status === 200 &&
      sent[sent.length - 1]!.email === newEmail &&
      db.user.some((row) => row.email === nextEmail),
  );
  const changeLink = linkFrom(sent[sent.length - 1]!.html);
  const otherUser = await auth.handler(
    new Request(changeLink, { headers: cookies(verified) }),
  );
  check(
    'email-change link refuses a different signed-in account',
    otherUser.status === 302 &&
      new URL(otherUser.headers.get('location')!).searchParams.has('error') &&
      !otherUser.headers.has('set-cookie') &&
      db.user.some((row) => row.email === nextEmail),
  );
  const changed = await auth.handler(
    new Request(changeLink, { headers: cookies(switched) }),
  );
  const changedSession = await auth.api.getSession({
    headers: cookies(changed),
  });
  check(
    'email-change verification preserves the account and updates its cookie',
    changed.status === 302 &&
      changedSession?.user.id === switchedSession?.user.id &&
      changedSession?.user.email === newEmail &&
      changedSession.user.emailVerified,
  );
  console.log('all verification-link expectations hold');
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
