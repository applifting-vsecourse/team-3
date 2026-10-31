import { simulatedInboxEnabled } from './simulated-inbox-enabled';

describe('simulatedInboxEnabled', () => {
  it('is on outside production unless switched off', () => {
    expect(simulatedInboxEnabled({})).toBe(true);
    expect(simulatedInboxEnabled({ nodeEnv: 'development' })).toBe(true);
    expect(simulatedInboxEnabled({ simulatedInbox: 'false' })).toBe(false);
  });

  it('in production needs SIMULATED_INBOX=true: a missing mail key is not enough', () => {
    expect(simulatedInboxEnabled({ nodeEnv: 'production' })).toBe(false);
    expect(
      simulatedInboxEnabled({ nodeEnv: 'production', simulatedInbox: '' }),
    ).toBe(false);
    expect(
      simulatedInboxEnabled({ nodeEnv: 'production', simulatedInbox: 'true' }),
    ).toBe(true);
  });

  it('is off next to a real e-mail service, even when asked for', () => {
    for (const mail of [
      { resendApiKey: 're_123' },
      { smtpHost: 'smtp.example', smtpUsername: 'u', smtpPassword: 'p' },
    ]) {
      expect(simulatedInboxEnabled({ ...mail, simulatedInbox: 'true' })).toBe(
        false,
      );
    }
  });
});
