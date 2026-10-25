import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConsoleMailerAdapter implements EmailService {
  // without an e-mail service the app shows the verification e-mail itself (#58)
  constructor(private readonly inbox?: SimulatedInbox) {}

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    console.log(`
      ====== Email Sent ======
      To: ${to}
      Subject: ${subject}
      html:
      ${html}
      ========================
    `);
    this.inbox?.record(to, subject, html);
  }
}
