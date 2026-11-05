import { Config } from '@/shared/config/config.service';
import { DynamicModule, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConsoleMailerAdapter } from './adapters/console-mailer/services/console-mailer-adapter';
import { EmailService } from './interfaces/email-service.interface';
import { MailModule } from './mail.module';
import {
  SIMULATED_INBOX,
  SimulatedInbox,
} from './simulated-inbox/simulated-inbox';

// The React Email templates come with the auth flows' subjects; not used here.
jest.mock('@/core/email/render', () => ({ renderEmail: jest.fn() }));

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
});
