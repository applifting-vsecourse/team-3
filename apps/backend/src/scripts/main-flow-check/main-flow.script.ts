/**
 * #467: the main flow through the real API on a real database, as a user
 * would go through it: sign-up → e-mail verification → an event with
 * approval → a request → approval → a full event → cancellation. It boots the
 * whole app the way main.ts does (`configureApp`), on a random port, and talks
 * to it over HTTP with each user's own cookies.
 *
 * It needs a throwaway database with the migrations applied and no e-mail
 * service, so the simulated inbox (#58) holds the verification e-mails. It can
 * run again on the same database. CI runs it against a throwaway Postgres;
 * locally pass DATABASE_URL explicitly, or dotenv takes the dev database from
 * apps/backend/.env:
 *
 *   DATABASE_URL=<throwaway db> pnpm backend migrate
 *   DATABASE_URL=<throwaway db> pnpm backend check:main-flow
 *
 * Don't point it at a database you care about: each run adds three users and a
 * cancelled event, and it adds a one-activity catalog („Test toku“, slug
 * `flow-check`). It exits with 1 when any step fails.
 */
import { AddressInfo } from 'node:net';
import { AppModule } from '@/app.module';
import { configureApp } from '@/core/configure-app';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SIGN_UP_CONSENT } from '@/shared/auth/domain/consent';
import { Config } from '@/shared/config/config.service';
import { NestFactory } from '@nestjs/core';

const PASSWORD = 'hobbyhub-flow-2026';
const DAY_MS = 24 * 60 * 60 * 1000;

class StepFailed extends Error {}

/** One person in the flow: their own cookies, like a browser of their own. */
class Client {
  private readonly cookies = new Map<string, string>();

  constructor(
    private readonly baseUrl: string,
    private readonly origin: string,
    readonly email: string,
  ) {}

  async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: unknown; response: Response }> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      redirect: 'manual',
      headers: {
        origin: this.origin,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(this.cookies.size > 0 ? { cookie: this.cookieHeader() } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1));
    }
    const text = await response.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: response.status, json, response };
  }

  private cookieHeader(): string {
    return [...this.cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

const step = async (label: string, run: () => Promise<void>): Promise<void> => {
  try {
    await run();
    console.log(`ok   ${label}`);
  } catch (error) {
    console.log(`FAIL ${label}`);
    throw error;
  }
};

const expectStatus = (
  label: string,
  result: { status: number; json: unknown },
  expected: number,
): void => {
  if (result.status !== expected) {
    throw new StepFailed(
      `${label}: expected HTTP ${expected}, got ${result.status} ${JSON.stringify(result.json)}`,
    );
  }
};

const field = (value: unknown, key: string): unknown =>
  value && typeof value === 'object'
    ? (value as Record<string, unknown>)[key]
    : undefined;

/** Signs up, follows the link from the simulated inbox and ends signed in. */
const signUpAndVerify = async (
  client: Client,
  name: string,
  frontendUrl: string,
): Promise<void> => {
  const up = await client.request('POST', '/api/auth/sign-up/email', {
    name,
    email: client.email,
    password: PASSWORD,
    callbackURL: `${frontendUrl}/email-overen`,
    ...SIGN_UP_CONSENT,
  });
  expectStatus(`sign-up ${client.email}`, up, 200);

  const inbox = await client.request('POST', '/api/simulated-inbox', {
    email: client.email,
    password: PASSWORD,
  });
  expectStatus(`simulated inbox ${client.email}`, inbox, 200);
  const messages = field(inbox.json, 'messages');
  const html = Array.isArray(messages)
    ? String(field(messages[0], 'html') ?? '')
    : '';
  const href = /href="([^"]*verify-email[^"]*)"/
    .exec(html)?.[1]
    ?.replace(/&amp;/g, '&');
  if (!href) throw new StepFailed(`no verification link for ${client.email}`);
  // the e-mail links to BACKEND_URL; the check listens on its own port
  const link = new URL(href);

  const verified = await client.request(
    'GET',
    `${link.pathname}${link.search}`,
  );
  if (verified.status >= 400) {
    expectStatus(`verification link ${client.email}`, verified, 302);
  }
  // an invalid or expired token still redirects, with ?error= in Location
  const location = verified.response.headers.get('location');
  const verifyError = location
    ? new URL(location, link).searchParams.get('error')
    : null;
  if (verifyError) {
    throw new StepFailed(
      `verification link ${client.email}: redirected with error ${verifyError}`,
    );
  }

  // #300 signs in after verification; sign in explicitly when it did not
  let profile = await client.request('GET', '/api/me/profile');
  if (profile.status === 401) {
    const signIn = await client.request('POST', '/api/auth/sign-in/email', {
      email: client.email,
      password: PASSWORD,
    });
    expectStatus(`sign-in ${client.email}`, signIn, 200);
    profile = await client.request('GET', '/api/me/profile');
  }
  expectStatus(`profile after verification ${client.email}`, profile, 200);
};

const main = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  const config = app.get(Config);
  configureApp(app, config);
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const prisma = app.get(PrismaService);

  try {
    // the smallest catalog an event needs; the full one is the seed's job
    const category = await prisma.activityCategory.upsert({
      where: { slug: 'flow-check' },
      create: {
        slug: 'flow-check',
        name: 'Test toku',
        icon: 'circle',
        sortOrder: 999,
      },
      update: {},
    });
    const activity = await prisma.activity.upsert({
      where: { slug: 'flow-check' },
      create: {
        slug: 'flow-check',
        name: 'Test toku',
        categoryId: category.id,
        sortOrder: 999,
      },
      update: {},
    });
    const locality = await prisma.locality.upsert({
      where: { slug: 'flow-check' },
      create: { slug: 'flow-check', name: 'Praha', lat: 50.0755, lng: 14.4378 },
      update: {},
    });

    const run = Date.now().toString(36);
    const user = (name: string): Client =>
      new Client(
        baseUrl,
        config.frontendUrl,
        `flow-${name}-${run}@example.com`,
      );
    const organizer = user('organizer');
    const participant = user('participant');
    const latecomer = user('latecomer');

    await step('sign-up and e-mail verification of three users', async () => {
      await signUpAndVerify(
        organizer,
        'Olga Organizátorka',
        config.frontendUrl,
      );
      await signUpAndVerify(participant, 'Petr Účastník', config.frontendUrl);
      await signUpAndVerify(latecomer, 'Lucie Pozdní', config.frontendUrl);
    });

    let eventId = '';
    await step(
      'organizer creates an event with approval for one person',
      async () => {
        const created = await organizer.request('POST', '/api/events', {
          title: 'Test hlavního toku',
          activityId: activity.id,
          localityId: locality.id,
          lat: locality.lat,
          lng: locality.lng,
          address: 'Testovací 1',
          startsAt: new Date(Date.now() + 2 * DAY_MS).toISOString(),
          minParticipants: 1,
          maxParticipants: 1,
          approvalMode: 'approval',
        });
        expectStatus('create event', created, 201);
        eventId = String(field(created.json, 'id') ?? '');
        if (!eventId)
          throw new StepFailed(
            `no event id in ${JSON.stringify(created.json)}`,
          );
      },
    );

    await step('participant asks to join and waits for approval', async () => {
      const joined = await participant.request(
        'POST',
        `/api/events/${eventId}/participation`,
        {},
      );
      expectStatus('join', joined, 200);
      const detail = await participant.request('GET', `/api/events/${eventId}`);
      expectStatus('detail', detail, 200);
      if (field(detail.json, 'myParticipation') !== 'pending') {
        throw new StepFailed(
          `expected pending, got ${JSON.stringify(field(detail.json, 'myParticipation'))}`,
        );
      }
    });

    await step('organizer approves the request', async () => {
      const list = await organizer.request(
        'GET',
        `/api/events/${eventId}/participants`,
      );
      expectStatus('participants', list, 200);
      const requests = field(list.json, 'requests');
      const requestId = Array.isArray(requests)
        ? field(requests[0], 'id')
        : undefined;
      if (typeof requestId !== 'string') {
        throw new StepFailed(`no request in ${JSON.stringify(list.json)}`);
      }
      const approved = await organizer.request(
        'POST',
        `/api/events/${eventId}/participants/approve`,
        {
          userIds: [requestId],
        },
      );
      expectStatus('approve', approved, 200);
      const detail = await participant.request('GET', `/api/events/${eventId}`);
      expectStatus('event detail after approval', detail, 200);
      if (field(detail.json, 'myParticipation') !== 'approved') {
        throw new StepFailed(
          `expected approved, got ${JSON.stringify(field(detail.json, 'myParticipation'))}`,
        );
      }
    });

    await step('the event is full: nobody else gets in', async () => {
      const refused = await latecomer.request(
        'POST',
        `/api/events/${eventId}/participation`,
        {},
      );
      expectStatus('join a full event', refused, 409);
      if (!JSON.stringify(refused.json).includes('EVENT_FULL')) {
        throw new StepFailed(
          `expected EVENT_FULL, got ${JSON.stringify(refused.json)}`,
        );
      }
    });

    await step(
      'organizer cancels the event and the participant sees it',
      async () => {
        const cancelled = await organizer.request(
          'POST',
          `/api/events/${eventId}/cancel`,
          {
            reason: 'Test hlavního toku končí.',
          },
        );
        expectStatus('cancel', cancelled, 200);
        const detail = await participant.request(
          'GET',
          `/api/events/${eventId}`,
        );
        expectStatus('detail after cancelling', detail, 200);
        if (field(detail.json, 'status') !== 'cancelled') {
          throw new StepFailed(
            `expected cancelled, got ${JSON.stringify(field(detail.json, 'status'))}`,
          );
        }
      },
    );

    console.log('Main flow passed.');
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
