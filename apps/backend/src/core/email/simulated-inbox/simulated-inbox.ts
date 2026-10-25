import { randomUUID } from 'node:crypto';

/** Injection token of the simulated inbox: null unless the console mailer is on. */
export const SIMULATED_INBOX = 'SimulatedInbox';

export type SimulatedEmail = {
  id: string;
  to: string;
  subject: string;
  html: string;
  sentAt: Date;
};

/** The last e-mails kept per address, and in total (the oldest go first). */
export const SIMULATED_INBOX_PER_ADDRESS = 3;
export const SIMULATED_INBOX_TOTAL = 500;

const sameAddress = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();

/**
 * What the console mailer would have sent (#58): an environment without an
 * e-mail service shows the verification e-mail in the app instead. Kept in
 * memory only, so a restart empties it. Only e-mails with `keptSubject` are
 * kept at all: a password-reset link must never be readable here, or anyone
 * could take over an account by asking for one.
 */
export class SimulatedInbox {
  private readonly emails: SimulatedEmail[] = [];

  constructor(private readonly keptSubject: string) {}

  record(to: string, subject: string, html: string, sentAt = new Date()): void {
    if (subject !== this.keptSubject) return;
    this.emails.push({ id: randomUUID(), to, subject, html, sentAt });
    const forAddress = this.emails.filter((email) => sameAddress(email.to, to));
    if (forAddress.length > SIMULATED_INBOX_PER_ADDRESS) {
      this.emails.splice(this.emails.indexOf(forAddress[0]), 1);
    }
    if (this.emails.length > SIMULATED_INBOX_TOTAL) this.emails.shift();
  }

  /** The e-mails sent to `address`, newest first. */
  messagesFor(address: string): SimulatedEmail[] {
    return this.emails
      .filter((email) => sameAddress(email.to, address))
      .reverse();
  }
}
