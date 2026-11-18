import * as nodemailer from 'nodemailer';
import { SMTPAdapter } from './smtp-adapter';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('SMTP sender (#165)', () => {
  it('includes a readable text version with the verification link', async () => {
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
    });
    const html =
      '<p>Ověř si e-mail</p><a href="https://example.com/verify?token=abc&amp;from=akce">Ověřit</a>';

    await email.sendEmail('recipient@example.com', 'Ověření', html);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html,
        text: expect.stringContaining(
          'https://example.com/verify?token=abc&from=akce',
        ),
      }),
    );
    expect(sendMail.mock.calls[0]![0].text).toContain('Ověř si e-mail');
  });

  it.each([undefined, '', '   ', 'HobbyHub <sender@example.com>'])(
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
        from: from?.trim() || 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject',
        html: '<p>Body</p>',
        text: 'Body',
      });
    },
  );
});
