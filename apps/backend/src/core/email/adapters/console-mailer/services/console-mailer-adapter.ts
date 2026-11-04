import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import { Injectable } from '@nestjs/common';
import { consoleEmailLog } from './console-email-log';

@Injectable()
export class ConsoleMailerAdapter implements EmailService {
  constructor(
    // without an e-mail service the app shows the verification e-mail itself (#58)
    private readonly inbox?: SimulatedInbox,
    // in production the log gets only the recipient and the subject (N-6)
    private readonly nodeEnv?: string,
  ) {}

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    console.log(consoleEmailLog({ to, subject, html }, this.nodeEnv));
    this.inbox?.record(to, subject, html);
  }
}
