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
  // the password is among leaked ones (Have I Been Pwned): sign-up, change and reset (#153)
  PASSWORD_COMPROMISED:
    "Tohle heslo se objevilo mezi uniklými hesly z jiných webů a útočníci ho zkoušejí jako první. Zvol prosím jiné.",
  // ours too (#153)
  CONSENT_REQUIRED:
    "K registraci je potřeba souhlas s podmínkami užívání a potvrzení, že bereš na vědomí zpracování osobních údajů.",
  INVALID_NAME: "Jméno může obsahovat jen písmena, mezery, pomlčky, apostrofy a tečky.",
}

// Our own checks whose Czech message says more than the code: INVALID_NAME
// names the character that doesn't belong in the name (#153).
const API_SAYS_IT_IN_CZECH = new Set(["INVALID_NAME"])

/** BetterAuth answers in English; the app shows Czech, per error code. */
export function authErrorMessage(error: BetterAuthError, fallback: string): string {
  if (error.status === 429) return "Příliš mnoho pokusů. Zkus to prosím za minutu."
  if (error.code && API_SAYS_IT_IN_CZECH.has(error.code) && error.message) return error.message
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

export const GOOGLE_SIGN_IN_FAILED = "Přihlášení přes Google se nepovedlo. Zkus to prosím znovu."

// What BetterAuth (or Google) puts in `?error=` when it sends the user back
// without signing in (#154). Only these are told apart; the code is never shown.
const GOOGLE_ERRORS: Record<string, string> = {
  // cancelled on Google's page
  access_denied: "Přihlášení přes Google je zrušené. Zkus to znovu, nebo se přihlas e-mailem.",
  // an account with the e-mail exists, but its e-mail isn't verified, so it isn't linked
  account_not_linked:
    "Účet s tímto e-mailem už v HobbyHubu máš, jen v něm zatím není ověřený e-mail. Přihlas se heslem a ověř si e-mail, pak půjde i Google.",
  email_not_found: "Google nám neposlal tvůj e-mail a bez něj se přihlásit nejde.",
}

/** #154: the Czech message for /login?error=… after Google. */
export const googleSignInErrorMessage = (code: string): string =>
  GOOGLE_ERRORS[code] ?? GOOGLE_SIGN_IN_FAILED
