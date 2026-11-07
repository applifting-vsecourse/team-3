import { consoleEmailLog } from './console-email-log';

const email = {
  to: 'jana@example.com',
  subject: 'Ověř svůj e-mail',
  html: '<a href="http://localhost:4050/api/auth/verify-email?token=secret-token">Ověřit</a>',
};

describe('consoleEmailLog', () => {
  it('outside production logs the whole e-mail, links included', () => {
    for (const nodeEnv of [undefined, 'development', 'test']) {
      const log = consoleEmailLog(email, nodeEnv);
      expect(log).toContain('jana@example.com');
      expect(log).toContain('Ověř svůj e-mail');
      expect(log).toContain('secret-token');
    }
  });

  it('in production logs only the recipient and the subject', () => {
    const log = consoleEmailLog(email, 'production');
    expect(log).toContain('To: jana@example.com');
    expect(log).toContain('Subject: Ověř svůj e-mail');
    expect(log).not.toContain('secret-token');
    expect(log).not.toContain('href');
  });
});
