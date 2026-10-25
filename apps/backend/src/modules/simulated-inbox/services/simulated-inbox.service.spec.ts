import { ConsoleMailerAdapter } from '@/core/email/adapters/console-mailer/services/console-mailer-adapter';
import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  emailFlowOptions,
  VERIFY_EMAIL_SUBJECT,
} from '@/shared/auth/config/email-flows';
import { Identity } from '@/shared/auth/domain/identity';
import { USER_BLOCKED } from '@/shared/auth/guards/verified-user.guard';
import { Config } from '@/shared/config/config.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import {
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

const eva = new Identity('u1', 'eva.mala@example.com', 'Eva Malá', 'user');

const setup = (
  inbox: SimulatedInbox | null,
  blockedAt: Date | null = null,
): SimulatedInboxService => {
  const prisma = mockDeep<PrismaService>();
  prisma.user.findUnique.mockResolvedValue({ blockedAt } as never);
  return new SimulatedInboxService(inbox, prisma);
};

describe('SimulatedInboxService', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('is 404 SIMULATED_INBOX_OFF when e-mails really go out', async () => {
    const error = await setup(null)
      .getMessages(eva)
      .catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getResponse()).toMatchObject({ code: SIMULATED_INBOX_OFF });
  });

  it('gives the signed-in user their verification e-mails, newest first', async () => {
    const inbox = new SimulatedInbox(VERIFY_EMAIL_SUBJECT);
    inbox.record(eva.email, VERIFY_EMAIL_SUBJECT, '<a>1</a>');
    inbox.record('jakub.kral@example.com', VERIFY_EMAIL_SUBJECT, '<a>J</a>');
    inbox.record(eva.email, VERIFY_EMAIL_SUBJECT, '<a>2</a>');

    const messages = await setup(inbox).getMessages(eva);

    expect(messages.map((message) => message.html)).toEqual([
      '<a>2</a>',
      '<a>1</a>',
    ]);
  });

  it('a blocked user gets 403 USER_BLOCKED', async () => {
    const inbox = new SimulatedInbox(VERIFY_EMAIL_SUBJECT);
    const error = await setup(inbox, new Date())
      .getMessages(eva)
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
      new ConsoleMailerAdapter(inbox),
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

    const messages = await setup(inbox).getMessages(eva);
    expect(messages).toHaveLength(1);
    expect(messages[0].subject).toBe(VERIFY_EMAIL_SUBJECT);
    expect(JSON.stringify(messages)).not.toContain('reset-t0k3n');
  });
});
