import { VERIFY_EMAIL_SUBJECT } from '@/shared/auth/config/email-flows';
import { Config } from '@/shared/config/config.service';
import { Global, Module, Provider } from '@nestjs/common';
import { ConsoleMailerAdapterFactory } from './adapters/console-mailer/console-mailer.adapter.factory';
import { ResendAdapterFactory } from './adapters/resend/resend.adapter.factory';
import { SMTPAdapterFactory } from './adapters/smtp/smtp.adapter.factory';
import { EmailModule } from './email.module';
import {
  SIMULATED_INBOX,
  SimulatedInbox,
} from './simulated-inbox/simulated-inbox';

const usesConsoleMailer = (config: Config): boolean =>
  !config.resendApiKey &&
  !(config.smtpHost && config.smtpUsername && config.smtpPassword);

// Only the verification e-mail is kept (#58), never the password reset.
const simulatedInboxProvider: Provider = {
  provide: SIMULATED_INBOX,
  useFactory: (config: Config): SimulatedInbox | null =>
    usesConsoleMailer(config) ? new SimulatedInbox(VERIFY_EMAIL_SUBJECT) : null,
  inject: [Config],
};

/**
 * Picks an email adapter based on env:
 *   RESEND_API_KEY set           → Resend
 *   SMTP_HOST + USERNAME + PASS  → SMTP
 *   otherwise                    → Console (logs emails to stdout, dev only;
 *                                  the verification e-mail also goes to the
 *                                  simulated inbox, `SIMULATED_INBOX`)
 *
 * Import this module whenever you need to inject `'EmailService'`.
 * The single shared `EmailService` instance is provided here so every
 * consumer (auth flows, debug endpoints, …) uses the same transport.
 */
@Global()
@Module({
  imports: [
    EmailModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const config = args[0] as Config;
        const inbox = args[1] as SimulatedInbox | null;
        if (config.resendApiKey) {
          return ResendAdapterFactory.create({
            apiKey: config.resendApiKey,
            from: config.emailFrom,
          });
        }
        if (config.smtpHost && config.smtpUsername && config.smtpPassword) {
          return SMTPAdapterFactory.create({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            user: config.smtpUsername,
            pass: config.smtpPassword,
          });
        }
        return ConsoleMailerAdapterFactory.create(inbox ?? undefined);
      },
      inject: [Config, SIMULATED_INBOX],
    }),
  ],
  providers: [simulatedInboxProvider],
  exports: [EmailModule, simulatedInboxProvider],
})
export class MailModule {}
