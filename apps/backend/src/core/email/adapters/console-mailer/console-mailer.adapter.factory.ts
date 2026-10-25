import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import { ConsoleMailerAdapter } from './services/console-mailer-adapter';

export class ConsoleMailerAdapterFactory {
  static create(inbox?: SimulatedInbox): EmailService {
    return new ConsoleMailerAdapter(inbox);
  }
}
