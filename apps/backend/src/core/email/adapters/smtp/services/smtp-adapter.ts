import { SMTPConfig } from '@/core/email/adapters/smtp/interfaces/smtp-config.interface';
import { EmailContent, EmailSender } from '@/core/email/email-sender';
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SMTPAdapter extends EmailSender {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: SMTPConfig) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  protected async sendContent(
    to: string,
    subject: string,
    { html, text }: EmailContent,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from?.trim() || this.config.user,
      to,
      subject,
      html,
      text,
    });
  }
}
