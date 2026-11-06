import * as nodemailer from 'nodemailer';
import { SMTPAdapter } from './smtp-adapter';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('SMTP sender (#165)', () => {
  it.each([undefined, 'HobbyHub <sender@example.com>'])(
    'uses EMAIL_FROM when configured (%s)',
    async (from) => {
      const sendMail = jest.fn().mockResolvedValue({});
      jest.mocked(nodemailer.createTransport).mockReturnValue({
        sendMail,
      } as unknown as nodemailer.Transporter);
      const email = new SMTPAdapter({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        user: 'sender@example.com',
        pass: 'test-password',
        from,
      });

      await email.sendEmail('recipient@example.com', 'Subject', '<p>Body</p>');

      expect(sendMail).toHaveBeenCalledWith({
        from: from ?? 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject',
        html: '<p>Body</p>',
      });
    },
  );
});
