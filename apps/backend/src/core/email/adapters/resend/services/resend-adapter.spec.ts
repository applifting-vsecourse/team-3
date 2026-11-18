import { Resend } from 'resend';
import { ResendAdapter } from './resend-adapter';

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

describe('Resend sender', () => {
  it('includes a readable text version with the verification link', async () => {
    mockSend.mockResolvedValue({ error: null });
    const adapter = new ResendAdapter({
      apiKey: 're_test',
      from: 'sender@example.com',
    });
    const html =
      '<p>Ověř si e-mail</p><p><a href="https://example.com/verify?token=abc&amp;from=akce">Ověřit</a></p>';

    await adapter.sendEmail('recipient@example.com', 'Ověření', html);

    expect(Resend).toHaveBeenCalledWith('re_test');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@example.com',
        html,
        text: expect.stringContaining(
          'https://example.com/verify?token=abc&from=akce',
        ),
      }),
    );
    expect(mockSend.mock.calls[0]![0].text).toContain('Ověř si e-mail');
  });
});
