import { Config } from '@/shared/config/config.service';
import { DynamicModule, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { validateSync } from 'class-validator';
import * as nodemailer from 'nodemailer';
import { ConsoleMailerAdapter } from './adapters/console-mailer/services/console-mailer-adapter';
import { ResendAdapterFactory } from './adapters/resend/resend.adapter.factory';
import { EmailService } from './interfaces/email-service.interface';
import { MailModule } from './mail.module';
import {
  SIMULATED_INBOX,
  SimulatedInbox,
} from './simulated-inbox/simulated-inbox';

// The React Email templates come with the auth flows' subjects; not used here.
jest.mock('@/core/email/render', () => ({ renderEmail: jest.fn() }));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

@Module({})
class ConfigStubModule {}

const withConfig = (config: Partial<Config>): DynamicModule => ({
  module: ConfigStubModule,
  global: true,
  providers: [{ provide: Config, useValue: config }],
  exports: [Config],
});

const compile = async (
  config: Partial<Config>,
): Promise<{ email: EmailService; inbox: SimulatedInbox | null }> => {
  const moduleRef = await Test.createTestingModule({
    imports: [withConfig(config), MailModule],
  }).compile();
  return {
    email: moduleRef.get<EmailService>('EmailService'),
    inbox: moduleRef.get<SimulatedInbox | null>(SIMULATED_INBOX),
  };
};

// Env decorators read process.env when Config is imported, not at construction.
// Re-import it with a complete fake environment so defaults are tested as deployed.
const environmentConfig = async (
  env: Record<string, string>,
): Promise<Config> => {
  jest.replaceProperty(process, 'env', {
    NODE_ENV: 'test',
    BETTER_AUTH_SECRET: 'test-only-auth-secret-for-mail-configuration',
    SMTP_SECURE: 'true',
    ...env,
  });
  let config!: Config;
  await jest.isolateModulesAsync(async () => {
    const { Config: EnvironmentConfig } =
      await import('@/shared/config/config.service');
    config = new EnvironmentConfig();
  });
  expect(validateSync(config)).toEqual([]);
  return config;
};

describe('MailModule', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('without an e-mail service the verification e-mail lands in the simulated inbox', async () => {
    const { email, inbox } = await compile({ emailFrom: 'x@example.com' });

    await email.sendEmail(
      'eva@example.com',
      'Ověř si e-mail v HobbyHubu',
      '<a>',
    );
    await email.sendEmail('eva@example.com', 'Nové heslo do HobbyHubu', '<a>');

    expect(email).toBeInstanceOf(ConsoleMailerAdapter);
    expect(
      inbox?.messagesFor('eva@example.com').map((message) => message.subject),
    ).toEqual(['Ověř si e-mail v HobbyHubu']);
  });

  it('in production a missing mail key alone does not turn the inbox on', async () => {
    const { email, inbox } = await compile({ nodeEnv: 'production' });

    expect(email).toBeInstanceOf(ConsoleMailerAdapter);
    expect(inbox).toBeNull();
  });

  it('in production the log gets no link, the simulated inbox still does (N-6, #58)', async () => {
    const { email, inbox } = await compile({
      nodeEnv: 'production',
      simulatedInbox: 'true',
    });
    const link = '<a href="https://x/verify?token=secret-token">Ověřit</a>';

    await email.sendEmail(
      'eva@example.com',
      'Ověř si e-mail v HobbyHubu',
      link,
    );

    const logged = jest.mocked(console.log).mock.calls.flat().join('\n');
    expect(logged).toContain('eva@example.com');
    expect(logged).toContain('Ověř si e-mail v HobbyHubu');
    expect(logged).not.toContain('secret-token');
    expect(inbox?.messagesFor('eva@example.com')[0]?.html).toBe(link);
  });

  it('with Resend or SMTP there is no simulated inbox', async () => {
    for (const config of [
      { resendApiKey: 're_123', emailFrom: 'x@example.com' },
      { smtpHost: 'smtp.example', smtpUsername: 'u', smtpPassword: 'p' },
    ]) {
      const { email, inbox } = await compile(config);

      expect(email).not.toBeInstanceOf(ConsoleMailerAdapter);
      expect(inbox).toBeNull();
    }
  });

  it.each([undefined, '', '   ', 'HobbyHub <sender@example.com>'])(
    'SMTP uses its username unless EMAIL_FROM is explicit (%s)',
    async (from) => {
      const sendMail = jest.fn().mockResolvedValue({});
      jest.mocked(nodemailer.createTransport).mockReturnValue({
        sendMail,
      } as unknown as nodemailer.Transporter);
      const config = await environmentConfig({
        SMTP_HOST: 'smtp.example.com',
        SMTP_USERNAME: 'smtp-user@example.com',
        SMTP_PASSWORD: 'test-only-smtp-password',
        ...(from === undefined ? {} : { EMAIL_FROM: from }),
      });
      const { email, inbox } = await compile(config);

      await email.sendEmail('recipient@example.com', 'Subject', '<p>Body</p>');

      expect(sendMail).toHaveBeenCalledWith({
        from: from?.trim()
          ? 'HobbyHub <sender@example.com>'
          : 'smtp-user@example.com',
        to: 'recipient@example.com',
        subject: 'Subject',
        html: '<p>Body</p>',
      });
      expect(inbox).toBeNull();
    },
  );

  it.each([undefined, '', '   ', 'HobbyHub <sender@example.com>'])(
    'Resend keeps its own default unless EMAIL_FROM is explicit (%s)',
    async (from) => {
      const sendEmail = jest.fn().mockResolvedValue(undefined);
      const create = jest
        .spyOn(ResendAdapterFactory, 'create')
        .mockReturnValue({ sendEmail });
      const config = await environmentConfig({
        RESEND_API_KEY: 're_test',
        ...(from === undefined ? {} : { EMAIL_FROM: from }),
      });
      const { email, inbox } = await compile(config);

      await email.sendEmail('recipient@example.com', 'Subject', '<p>Body</p>');

      expect(create).toHaveBeenCalledWith({
        apiKey: 're_test',
        from: from?.trim()
          ? 'HobbyHub <sender@example.com>'
          : 'HobbyHub <onboarding@resend.dev>',
      });
      expect(sendEmail).toHaveBeenCalledWith(
        'recipient@example.com',
        'Subject',
        '<p>Body</p>',
      );
      expect(inbox).toBeNull();
    },
  );
});
