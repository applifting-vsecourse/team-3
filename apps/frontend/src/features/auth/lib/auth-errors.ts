/** An error from the BetterAuth client: its code is what the app reacts to. */
type BetterAuthError = { code?: string; status?: number; message?: string }

const MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "Odkaz je neplatný, nebo už vypršel. Pošli si prosím nový.",
  TOKEN_EXPIRED: "Odkaz už vypršel. Pošli si prosím nový.",
  USER_NOT_FOUND: "Účet k tomuto odkazu už neexistuje.",
  PASSWORD_TOO_SHORT: "Heslo je příliš krátké.",
  PASSWORD_TOO_LONG: "Heslo je příliš dlouhé.",
  EMAIL_ALREADY_VERIFIED: "E-mail už je ověřený.",
  // the same for a wrong e-mail and a wrong password: it doesn't tell which accounts exist
  INVALID_EMAIL_OR_PASSWORD: "Nesprávný e-mail nebo heslo.",
  INVALID_EMAIL: "Zadej platný e-mail.",
  USER_ALREADY_EXISTS: "Účet s tímto e-mailem už existuje. Přihlas se, nebo si obnov heslo.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Účet s tímto e-mailem už existuje. Přihlas se, nebo si obnov heslo.",
  // our own check (B-010), the API says why in Czech already
  WEAK_PASSWORD: "Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici.",
}

/** BetterAuth answers in English; the app shows Czech, per error code. */
export function authErrorMessage(error: BetterAuthError, fallback: string): string {
  if (error.status === 429) return "Příliš mnoho pokusů. Zkus to prosím za minutu."
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
