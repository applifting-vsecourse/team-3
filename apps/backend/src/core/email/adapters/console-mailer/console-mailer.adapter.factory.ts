import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import { ConsoleMailerAdapter } from './services/console-mailer-adapter';

export class ConsoleMailerAdapterFactory {
  /** `nodeEnv` is required: see ConsoleMailerAdapter (N-6). */
  static create(
    nodeEnv: string | undefined,
    inbox?: SimulatedInbox,
  ): EmailService {
    return new ConsoleMailerAdapter(nodeEnv, inbox);
  }
}
