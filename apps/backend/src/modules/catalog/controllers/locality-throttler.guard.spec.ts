import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { CatalogController } from './catalog.controller';
import {
  LOCALITY_THROTTLER_OPTIONS,
  LocalityThrottlerGuard,
} from './locality-throttler.guard';

// Factories, so neither better-auth's ESM-only node entry nor the provider's
// e-mail templates are loaded under Jest; the guards here need neither.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const LIMIT = 20;

describe('LocalityThrottlerGuard', () => {
  let moduleRef: TestingModule;
  let guard: LocalityThrottlerGuard;

  const add = (userId: string): Promise<boolean> =>
    guard.canActivate({
      getHandler: () => CatalogController.prototype.addLocality,
      getClass: () => CatalogController,
      switchToHttp: () => ({
        getRequest: () => ({ session: { user: { id: userId } } }),
        getResponse: () => ({ header: jest.fn() }),
      }),
    } as unknown as ExecutionContext);

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(LOCALITY_THROTTLER_OPTIONS)],
      providers: [LocalityThrottlerGuard],
    }).compile();
    await moduleRef.init();
    guard = moduleRef.get(LocalityThrottlerGuard);
  });

  afterEach(() => moduleRef.close());

  it('stops a user over the hourly limit with 429 and a Czech message', async () => {
    for (let i = 0; i < LIMIT; i++) {
      await expect(add('eva')).resolves.toBe(true);
    }

    const error = await add('eva').catch((e: HttpException) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).message).toBe(
      'Nových míst je teď moc. Zkus to znovu za chvíli.',
    );
  });

  it('counts per user: others on the same IP go on', async () => {
    for (let i = 0; i < LIMIT; i++) await add('eva');

    await expect(add('adam')).resolves.toBe(true);
  });

  it('runs after the guard that needs a verified e-mail and sets the session', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        CatalogController.prototype.addLocality,
      ),
    ).toEqual([VerifiedUserGuard, LocalityThrottlerGuard]);
  });
});
