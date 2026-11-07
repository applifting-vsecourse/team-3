import { ConsoleMailerAdapter } from '@/core/email/adapters/console-mailer/services/console-mailer-adapter';
import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  emailFlowOptions,
  VERIFY_EMAIL_SUBJECT,
} from '@/shared/auth/config/email-flows';
import { USER_BLOCKED } from '@/shared/auth/guards/verified-user.guard';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import {
  INVALID_EMAIL_OR_PASSWORD,
  SIMULATED_INBOX_OFF,
  SimulatedInboxService,
} from './simulated-inbox.service';

// The React Email templates are replaced: rendering them isn't what's tested.
jest.mock('@/core/email/render', () => ({
  renderEmail: jest.fn(
    async (_template: unknown, props: { url: string }) =>
      `<a href="${props.url}">`,
  ),
}));
jest.mock('@/core/email/templates/reset-password', () => ({
  ResetPassword: 'ResetPassword',
}));
jest.mock('@/core/email/templates/verify-email', () => ({
  VerifyEmail: 'VerifyEmail',
}));
// USER_BLOCKED comes from the guard's file, which would load better-auth's
// ESM-only node entry; the guard itself isn't used here.
jest.mock('@/shared/auth/utils/get-session-from-request', () => ({
  getSessionFromRequest: jest.fn(),
}));
jest.mock('@/shared/auth/providers/better-auth.provider', () => ({
  InjectBetterAuth: (): void => undefined,
}));

const eva = { id: 'u1', email: 'eva.mala@example.com', name: 'Eva Malá' };
// Eva's password and the „hash“ the stand-in for BetterAuth's verify accepts
const credentials = { email: eva.email, password: 'hobbyhub-demo-2026' };
const HASH = 'hash-of:hobbyhub-demo-2026';

const setup = (
  inbox: SimulatedInbox | null,
  {
    blockedAt = null as Date | null,
    account = { password: HASH } as { password: string | null } | null,
  } = {},
): { service: SimulatedInboxService; prisma: ReturnType<typeof mockDeep<PrismaService>> } => {
  const prisma = mockDeep<PrismaService>();
  prisma.account.findFirst.mockResolvedValue(
    (account
      ? { ...account, user: { email: eva.email, blockedAt } }
      : null) as never,
  );
  const verify = jest.fn(
    async ({ hash, password }: { hash: string; password: string }) =>
      hash === `hash-of:${password}`,
  );
  const auth = {
    $context: Promise.resolve({ password: { verify } }),
  } as unknown as BetterAuth;
  return { service: new SimulatedInboxService(inbox, prisma, auth), prisma };
};

describe('SimulatedInboxService', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('is 404 SIMULATED_INBOX_OFF when e-mails really go out', async () => {
    const { service, prisma } = setup(null);
    const error = await service.getMessages(credentials).catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getResponse()).toMatchObject({ code: SIMULATED_INBOX_OFF });
    // where e-mails really go out, it tests no passwords at all
    expect(prisma.account.findFirst).not.toHaveBeenCalled();
  });

  it('gives the account its verification e-mails, newest first, for the right password (#236: no session)', async () => {
    const inbox = new SimulatedInbox(VERIFY_EMAIL_SUBJECT);
    inbox.record(eva.email, VERIFY_EMAIL_SUBJECT, '<a>1</a>');
    inbox.record('jakub.kral@example.com', VERIFY_EMAIL_SUBJECT, '<a>J</a>');
    inbox.record(eva.email, VERIFY_EMAIL_SUBJECT, '<a>2</a>');

    const { service, prisma } = setup(inbox);
    const messages = await service.getMessages({
      ...credentials,
      email: ' Eva.Mala@example.com ',
    });

    expect(messages.map((message) => message.html)).toEqual([
      '<a>2</a>',
      '<a>1</a>',
    ]);
    // the password of the e-mail-and-password account, the address as BetterAuth keeps it
    expect(prisma.account.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId: 'credential', user: { email: eva.email } },
      }),
    );
  });

  it.each([
    ['a wrong password', { account: { password: HASH } }, 'jiné-heslo-2026'],
    ['an unknown e-mail', { account: null }, credentials.password],
    ['an account without a password (Google)', { account: { password: null } }, credentials.password],
  ])(
    '%s is 401 INVALID_EMAIL_OR_PASSWORD, the same for each',
    async (_, options, password) => {
      const inbox = new SimulatedInbox(VERIFY_EMAIL_SUBJECT);
      inbox.record(eva.email, VERIFY_EMAIL_SUBJECT, '<a>1</a>');

      const error = await setup(inbox, options)
        .service.getMessages({ ...credentials, password })
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.getResponse()).toMatchObject({
        code: INVALID_EMAIL_OR_PASSWORD,
      });
    },
  );

  it('a blocked user gets 403 USER_BLOCKED', async () => {
    const inbox = new SimulatedInbox(VERIFY_EMAIL_SUBJECT);
    const error = await setup(inbox, { blockedAt: new Date() })
      .service.getMessages(credentials)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ code: USER_BLOCKED });
  });

  it('never shows the password-reset e-mail the auth flows send, only the verification', async () => {
    const inbox = new SimulatedInbox(VERIFY_EMAIL_SUBJECT);
    const flows = emailFlowOptions(
      {
        frontendUrl: 'https://hobbyhub.example',
        frontendResetPasswordUrl: 'reset-password',
      } as Config,
      new ConsoleMailerAdapter('development', inbox),
    );
    const user = { id: eva.id, name: eva.name, email: eva.email } as never;

    await flows.emailAndPassword.sendResetPassword!(
      { user, url: 'ignored', token: 'reset-t0k3n' },
      undefined,
    );
    await flows.emailVerification.sendVerificationEmail!(
      { user, url: 'https://api.example/verify?token=abc', token: 'abc' },
      undefined,
    );

    const messages = await setup(inbox).service.getMessages(credentials);
    expect(messages).toHaveLength(1);
    expect(messages[0].subject).toBe(VERIFY_EMAIL_SUBJECT);
    expect(JSON.stringify(messages)).not.toContain('reset-t0k3n');
  });
});
