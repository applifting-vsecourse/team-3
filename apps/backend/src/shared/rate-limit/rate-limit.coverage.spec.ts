import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LocalityThrottlerGuard } from '@/modules/catalog/controllers/locality-throttler.guard';
import { EventsController } from '@/modules/event/controllers/events.controller';
import { GroupsController } from '@/modules/group/controllers/groups.controller';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import { RequestMethod, Type } from '@nestjs/common';
import {
  CONTROLLER_WATERMARK,
  GUARDS_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants';
import {
  CreateThrottlerGuard,
  PublicReadThrottlerGuard,
  WriteThrottlerGuard,
} from './rate-limit.guards';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest; only the decorators are read here.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

/** Every controller in the backend, so a new one can't be left out. */
const CONTROLLERS: Type[] = (
  readdirSync(join(__dirname, '..', '..'), {
    recursive: true,
    encoding: 'utf8',
  }) as string[]
)
  .filter((file) => file.endsWith('.controller.ts'))
  .flatMap(
    (file) =>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Object.values(require(join(__dirname, '..', '..', file))) as unknown[],
  )
  .filter(
    (value): value is Type =>
      typeof value === 'function' &&
      Reflect.getMetadata(CONTROLLER_WATERMARK, value) === true,
  );

/**
 * Writes without a per-user limit: the simulated inbox needs no account and
 * has its own limits per IP and address; an account confirms its age once,
 * which only sets a timestamp.
 */
const UNLIMITED = [
  'SimulatedInboxController.open',
  'AgeConfirmationController.confirm',
];

const WRITES = [
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
];
const AUTH_GUARDS: unknown[] = [AuthenticatedUserGuard, VerifiedUserGuard];
const USER_THROTTLERS: unknown[] = [
  WriteThrottlerGuard,
  CreateThrottlerGuard,
  LocalityThrottlerGuard,
];

const guardsOf = (controller: Type, handler: string): unknown[] => [
  ...((Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[]) ?? []),
  ...((Reflect.getMetadata(
    GUARDS_METADATA,
    controller.prototype[handler] as object,
  ) as unknown[]) ?? []),
];

const writeRoutes = CONTROLLERS.flatMap((controller) =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter((handler) =>
      WRITES.includes(
        Reflect.getMetadata(
          METHOD_METADATA,
          controller.prototype[handler] as object,
        ) as RequestMethod,
      ),
    )
    .map((handler) => ({
      route: `${controller.name}.${handler}`,
      guards: guardsOf(controller, handler),
    })),
).filter(({ route }) => !UNLIMITED.includes(route));

describe('rate limits on the API', () => {
  it('finds the controllers and their writes', () => {
    expect(CONTROLLERS).toContain(EventsController);
    expect(writeRoutes.length).toBeGreaterThanOrEqual(29);
  });

  it.each(writeRoutes)(
    '$route is limited per user, after the guard that sets the session',
    ({ guards }) => {
      const throttler = guards.findIndex((guard) =>
        USER_THROTTLERS.includes(guard),
      );
      const auth = guards.findIndex((guard) => AUTH_GUARDS.includes(guard));

      expect(throttler).toBeGreaterThan(-1);
      expect(auth).toBeGreaterThan(-1);
      expect(auth).toBeLessThan(throttler);
    },
  );

  it('creating events and groups has the hourly limit', () => {
    expect(guardsOf(EventsController, 'create')).toContain(
      CreateThrottlerGuard,
    );
    expect(guardsOf(GroupsController, 'create')).toContain(
      CreateThrottlerGuard,
    );
  });

  it('the public reads with organisers and admins are limited per IP (N-10)', () => {
    expect(guardsOf(EventsController, 'list')).toEqual([
      PublicReadThrottlerGuard,
    ]);
    expect(guardsOf(EventsController, 'detail')).toEqual([
      OptionalUserGuard,
      PublicReadThrottlerGuard,
    ]);
    expect(guardsOf(GroupsController, 'detail')).toEqual([
      OptionalUserGuard,
      PublicReadThrottlerGuard,
    ]);
  });
});
