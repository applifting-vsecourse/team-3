import { PrismaService } from '@/core/prisma/prisma.service';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { Config } from '@/shared/config/config.service';
import { DynamicModule, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import { NotificationModule } from './notification.module';
import { NotificationService } from './services/notification.service';

// react-email's render can't run under jest; the wiring is what is tested here
jest.mock('@/core/email/render', () => ({
  renderEmail: jest.fn(async () => '<html>mail</html>'),
}));
// The centre's controller (#86) is guarded by a session: better-auth's
// ESM-only entry can't load under Jest, so the auth module and the session
// lookup are stubs and the guard is replaced below.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));
jest.mock('@/shared/auth/auth.module', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Module: NestModule } = require('@nestjs/common');
  @NestModule({})
  class AuthModule {}
  return { AuthModule };
});

@Module({})
class ConfigStubModule {}

const withConfig = (config: Partial<Config>): DynamicModule => ({
  module: ConfigStubModule,
  global: true,
  providers: [{ provide: Config, useValue: config }],
  exports: [Config],
});

describe('NotificationModule', () => {
  afterEach(() => jest.restoreAllMocks());

  it('wires the service to the database, the shared mail transport and the config', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const prisma = mockDeep<PrismaService>();
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      title: 'Deskovky ve středu',
      startsAt: new Date('2026-11-11T17:00:00.000Z'),
      endsAt: null,
      address: 'Herna Karlín',
      cancelReason: 'Herna má zavřeno.',
      maxParticipants: 6,
      organizerUserId: 'u1',
      _count: { participations: 1 },
    } as never);
    prisma.participation.findMany.mockResolvedValue([
      { user: { id: 'u2', name: 'Jana', email: 'jana@example.com' } },
    ] as never);
    const moduleRef = await Test.createTestingModule({
      imports: [
        withConfig({
          frontendUrl: 'https://hobbyhub.example',
          emailFrom: 'HobbyHub <x@example.com>',
        }),
        NotificationModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(AuthenticatedUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    // no mail provider configured: the console mailer takes the mail, as on a dev machine
    await moduleRef
      .get(NotificationService)
      .deliver({ type: 'event-cancelled', eventId: 'e1' });

    const logged = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(logged).toContain('jana@example.com');
    expect(logged).toContain('Akce zrušena: Deskovky ve středu');
  });
});
