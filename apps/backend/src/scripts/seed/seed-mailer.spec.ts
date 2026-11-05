import { seedMailer } from './seed-mailer';

const link =
  '<a href="https://hobbyhub.example/api/auth/verify-email?token=secret-token">Ověřit</a>';

const logged = (): string =>
  jest.mocked(console.log).mock.calls.flat().join('\n');

describe('seedMailer', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('in production logs the demo accounts’ verification e-mails without the link (N-6)', async () => {
    await seedMailer({ nodeEnv: 'production' }).sendEmail(
      'petra.novakova@example.com',
      'Ověř si e-mail v HobbyHubu',
      link,
    );

    expect(logged()).toContain('petra.novakova@example.com');
    expect(logged()).toContain('Ověř si e-mail v HobbyHubu');
    expect(logged()).not.toContain('secret-token');
  });

  it('locally logs the whole e-mail', async () => {
    await seedMailer({ nodeEnv: 'development' }).sendEmail(
      'petra.novakova@example.com',
      'Ověř si e-mail v HobbyHubu',
      link,
    );

    expect(logged()).toContain('secret-token');
  });
});
