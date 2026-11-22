import { ExecutionContext, HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  CreateThrottlerGuard,
  PublicReadThrottlerGuard,
  WriteThrottlerGuard,
} from './rate-limit.guards';
import { RATE_LIMIT_OPTIONS, RATE_LIMITS } from './rate-limits';

class EventsRoutes {
  create(): void {}
  join(): void {}
  detail(): void {}
}
class GroupsRoutes {
  create(): void {}
  join(): void {}
  detail(): void {}
}

type Request = { session?: { user: { id: string } }; ip?: string };

const call =
  (guard: { canActivate(context: ExecutionContext): Promise<boolean> }) =>
  (
    routes: typeof EventsRoutes | typeof GroupsRoutes,
    handler: 'create' | 'join' | 'detail',
    request: Request,
  ): Promise<boolean> =>
    guard.canActivate({
      getHandler: () => routes.prototype[handler],
      getClass: () => routes,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ header: jest.fn() }),
      }),
    } as unknown as ExecutionContext);

const user = (id: string): Request => ({
  session: { user: { id } },
  ip: '10.0.0.1',
});

const rejection = (attempt: Promise<boolean>): Promise<HttpException> =>
  attempt.then(
    () => {
      throw new Error('expected 429');
    },
    (error: HttpException) => error,
  );

describe('rate limit guards', () => {
  let moduleRef: TestingModule;
  let create: ReturnType<typeof call>;
  let write: ReturnType<typeof call>;
  let read: ReturnType<typeof call>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(RATE_LIMIT_OPTIONS)],
      providers: [
        CreateThrottlerGuard,
        WriteThrottlerGuard,
        PublicReadThrottlerGuard,
      ],
    }).compile();
    await moduleRef.init();
    create = call(moduleRef.get(CreateThrottlerGuard));
    write = call(moduleRef.get(WriteThrottlerGuard));
    read = call(moduleRef.get(PublicReadThrottlerGuard));
  });

  afterEach(() => moduleRef.close());

  describe('creating events and groups', () => {
    const LIMIT = RATE_LIMITS.create.limit;

    it('counts events and groups together and answers 429 with a Czech message', async () => {
      for (let i = 0; i < LIMIT / 2; i++) {
        await expect(create(EventsRoutes, 'create', user('eva'))).resolves.toBe(
          true,
        );
        await expect(create(GroupsRoutes, 'create', user('eva'))).resolves.toBe(
          true,
        );
      }

      const error = await rejection(
        create(GroupsRoutes, 'create', user('eva')),
      );

      expect(error.getStatus()).toBe(429);
      expect(error.message).toBe(
        'Nových akcí a skupin je teď moc. Zkus to znovu později.',
      );
    });

    it('counts per user: others on the same IP go on', async () => {
      for (let i = 0; i < LIMIT; i++) {
        await create(EventsRoutes, 'create', user('eva'));
      }

      await expect(create(EventsRoutes, 'create', user('adam'))).resolves.toBe(
        true,
      );
    });

    it('leaves the other writes of a user who reached it alone', async () => {
      for (let i = 0; i < LIMIT; i++) {
        await create(EventsRoutes, 'create', user('eva'));
      }

      await expect(write(EventsRoutes, 'join', user('eva'))).resolves.toBe(
        true,
      );
    });
  });

  describe('other writes', () => {
    const LIMIT = RATE_LIMITS.write.limit;

    it('share one count across routes and answer 429 with a Czech message', async () => {
      for (let i = 0; i < LIMIT / 2; i++) {
        await write(EventsRoutes, 'join', user('eva'));
        await write(GroupsRoutes, 'join', user('eva'));
      }

      const error = await rejection(write(EventsRoutes, 'join', user('eva')));

      expect(error.getStatus()).toBe(429);
      expect(error.message).toBe(
        'Posíláš toho teď moc najednou. Zkus to znovu za chvíli.',
      );
    });

    it('counts per user: others on the same IP go on', async () => {
      for (let i = 0; i < LIMIT; i++) {
        await write(EventsRoutes, 'join', user('eva'));
      }

      await expect(write(EventsRoutes, 'join', user('adam'))).resolves.toBe(
        true,
      );
    });

    it('count creating too, so creating stops at the write limit as well', async () => {
      for (let i = 0; i < LIMIT; i++) {
        await write(EventsRoutes, 'join', user('eva'));
      }

      const error = await rejection(
        create(EventsRoutes, 'create', user('eva')),
      );

      expect(error.getStatus()).toBe(429);
    });

    it('fall back to the IP when no session is on the request', async () => {
      const anonymous = { ip: '10.0.0.9' };
      for (let i = 0; i < LIMIT; i++) {
        await write(EventsRoutes, 'join', anonymous);
      }

      await expect(
        rejection(write(EventsRoutes, 'join', anonymous)),
      ).resolves.toBeInstanceOf(HttpException);
      // the IP's count is not a signed-in user's
      await expect(
        write(EventsRoutes, 'join', { ...user('eva'), ip: '10.0.0.9' }),
      ).resolves.toBe(true);
    });
  });

  describe('public reads', () => {
    const LIMIT = RATE_LIMITS.publicRead.limit;

    it('count per IP across events and groups and answer 429 with a Czech message', async () => {
      for (let i = 0; i < LIMIT / 2; i++) {
        await read(EventsRoutes, 'detail', { ip: '10.0.0.1' });
        await read(GroupsRoutes, 'detail', { ip: '10.0.0.1' });
      }

      const error = await rejection(
        read(EventsRoutes, 'detail', { ip: '10.0.0.1' }),
      );

      expect(error.getStatus()).toBe(429);
      expect(error.message).toBe(
        'Načítáš toho teď moc najednou. Zkus to znovu za chvíli.',
      );
      await expect(
        read(EventsRoutes, 'detail', { ip: '10.0.0.2' }),
      ).resolves.toBe(true);
    });
  });
});
