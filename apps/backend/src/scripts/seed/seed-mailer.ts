import { ConsoleMailerAdapterFactory } from '@/core/email/adapters/console-mailer/console-mailer.adapter.factory';
import { EmailService } from '@/core/email/interfaces/email-service.interface';
import type { Config } from '@/shared/config/config.service';

/**
 * The seed's e-mail: it signs up the superadmin and the demo accounts through
 * BetterAuth, which sends each a verification e-mail. Only to the log, and in
 * production only the recipient and the subject (N-6, #229).
 */
export const seedMailer = (config: Pick<Config, 'nodeEnv'>): EmailService =>
  ConsoleMailerAdapterFactory.create(config.nodeEnv);
