/**
 * #153: what signing up asks for, as sent in the sign-up body — the terms of
 * use accepted and the privacy notice acknowledged. Not columns: the user row
 * keeps only when it happened (`termsAcceptedAt`), and the server sets that.
 */
export const SIGN_UP_CONSENT = {
  termsAccepted: true,
  privacyAcknowledged: true,
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
