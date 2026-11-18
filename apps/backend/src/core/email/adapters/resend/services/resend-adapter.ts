import { ResendConfig } from '@/core/email/adapters/resend/interfaces/resend-config.interface';
import { EmailContent, EmailSender } from '@/core/email/email-sender';
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendAdapter extends EmailSender {
  private readonly logger = new Logger(ResendAdapter.name);
  private readonly client: Resend;

  constructor(private readonly config: ResendConfig) {
    super();
    this.client = new Resend(config.apiKey);
  }

  protected async sendContent(
    to: string,
    subject: string,
    { html, text }: EmailContent,
  ): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.config.from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      this.logger.error(`Resend delivery failed: ${error.message}`, error);
      throw new Error(`Resend delivery failed: ${error.message}`);
    }
  }
}
