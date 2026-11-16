import { toPlainText } from 'react-email';

export type EmailContent = { html: string; text: string };

/** Every transport receives the same HTML and text content. */
export interface EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

export abstract class EmailSender implements EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<void> {
    return this.sendContent(to, subject, { html, text: toPlainText(html) });
  }

  protected abstract sendContent(
    to: string,
    subject: string,
    content: EmailContent,
  ): Promise<void>;
}
