/** An error from the BetterAuth client: its code is what the app reacts to. */
type BetterAuthError = { code?: string; status?: number; message?: string }

const MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "Odkaz je neplatný, nebo už vypršel. Pošlete si prosím nový.",
  TOKEN_EXPIRED: "Odkaz už vypršel. Pošlete si prosím nový.",
  USER_NOT_FOUND: "Účet k tomuto odkazu už neexistuje.",
  PASSWORD_TOO_SHORT: "Heslo je příliš krátké.",
  PASSWORD_TOO_LONG: "Heslo je příliš dlouhé.",
  EMAIL_ALREADY_VERIFIED: "E-mail už je ověřený.",
}

/** BetterAuth answers in English; the app shows Czech, per error code. */
export function authErrorMessage(error: BetterAuthError, fallback: string): string {
  if (error.status === 429) return "Příliš mnoho pokusů. Zkuste to prosím za minutu."
  return (error.code ? MESSAGES[error.code] : undefined) ?? fallback
}

/** Thrown by the auth hooks: a Czech message, and the code to react to. */
export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = "AuthRequestError"
  }
}

export const toAuthRequestError = (error: BetterAuthError, fallback: string) =>
  new AuthRequestError(authErrorMessage(error, fallback), error.code)
