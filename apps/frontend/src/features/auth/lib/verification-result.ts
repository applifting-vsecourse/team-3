/**
 * What the link in the verification e-mail ended with (#155). /email-overen
 * hands it over in the history state of the page it sends the user on to, and
 * `EmailVerifiedDialog` shows it there: that page's address stays as it was,
 * and closing the dialog takes the result out again.
 */
export type VerificationResult = {
  /** BetterAuth's code when the link didn't work, e.g. `TOKEN_EXPIRED`. */
  error?: string
}

declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface HistoryState {
    emailVerification?: VerificationResult
  }
}
