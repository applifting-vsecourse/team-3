/**
 * Confirmations sent by e-mail sign-up. The server records when the user
 * accepted the terms and confirmed their age on the account.
 */
export const SIGN_UP_CONSENT = {
  termsAccepted: true,
  privacyAcknowledged: true,
  ageConfirmed: true,
} as const;

export const CONSENT_RULE =
  'K registraci je potřeba souhlas s podmínkami užívání a potvrzení, že bereš na vědomí zpracování osobních údajů.';

/** What's missing from a sign-up's consent, in Czech, or null when both were given. */
export const consentProblem = (
  body: Partial<Record<keyof typeof SIGN_UP_CONSENT, unknown>>,
): string | null =>
  // exactly true: „false“, "true" or a missing field is no consent
  body.termsAccepted === true && body.privacyAcknowledged === true
    ? null
    : CONSENT_RULE;
