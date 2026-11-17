import { EmailContent, EmailSender } from '@/core/email/email-sender';
import { SimulatedInbox } from '@/core/email/simulated-inbox/simulated-inbox';
import { Injectable } from '@nestjs/common';
import { consoleEmailLog } from './console-email-log';

@Injectable()
export class ConsoleMailerAdapter extends EmailSender {
  constructor(
    // In production the log gets only the recipient and the subject (N-6).
    // Required, even as undefined: a caller that forgets it would log whole
    // e-mails, links included, in production (the seed did, #229).
    private readonly nodeEnv: string | undefined,
    // without an e-mail service the app shows the verification e-mail itself (#58)
    private readonly inbox?: SimulatedInbox,
  ) {
    super();
  }

  protected async sendContent(
    to: string,
    subject: string,
    { html }: EmailContent,
  ): Promise<void> {
    console.log(consoleEmailLog({ to, subject, html }, this.nodeEnv));
    this.inbox?.record(to, subject, html);
  }
}
