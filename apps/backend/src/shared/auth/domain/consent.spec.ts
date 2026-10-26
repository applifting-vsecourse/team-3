import { CONSENT_RULE, consentProblem, SIGN_UP_CONSENT } from './consent';

describe('consentProblem (#153)', () => {
  it('is fine when both consents were given', () => {
    expect(consentProblem(SIGN_UP_CONSENT)).toBeNull();
  });

  it('wants both, each exactly true', () => {
    for (const body of [
      {},
      { termsAccepted: true },
      { privacyAcknowledged: true },
      { termsAccepted: true, privacyAcknowledged: false },
      { termsAccepted: 'true', privacyAcknowledged: 'true' },
      { termsAccepted: 1, privacyAcknowledged: 1 },
    ]) {
      expect(consentProblem(body)).toBe(CONSENT_RULE);
    }
  });
});
