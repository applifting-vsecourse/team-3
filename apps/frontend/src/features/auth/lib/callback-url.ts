import type { ParsedLocation } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { encodeRedirectUri, safeRedirect } from "@/features/auth/lib/redirect"

/**
 * Where the link in the verification e-mail leads once it has checked the
 * token (BetterAuth adds `?error=` when it didn't work): /email-overen, which
 * sends the user on to `from` with a dialog saying how it went (#155).
 * Absolute: the link goes through the backend first, and without it
 * BetterAuth would send the user to the backend's own „/“.
 */
export const afterVerificationUrl = (from?: string) => {
  const url = new URL(ROUTES.emailVerified, window.location.origin)
  // back where the sign-up started, e.g. the event (B-012)
  if (from) url.searchParams.set("from", from)
  return url.toString()
}

/**
 * The `from` of a link sent again from the banner or the dialog after an
 * expired link (#58, #155): the page it was asked for on. /email-overen only
 * passes through to its own `from`, but the banner is up there while the
 * session refreshes: that `from` then, so the new link doesn't lead back to
 * the error. The password pages are no place to come back to (and
 * /reset-password carries a token).
 */
export const resendFrom = (location: ParsedLocation): string | undefined => {
  if (location.pathname === ROUTES.emailVerified) {
    const { from } = location.search as { from?: unknown }
    return typeof from === "string" ? from : undefined
  }
  if (location.pathname === ROUTES.forgotPassword || location.pathname === ROUTES.resetPassword) {
    return undefined
  }
  return encodeRedirectUri(location)
}

/**
 * #154: where Google sends the user back, through the backend — so absolute,
 * like afterVerificationUrl. Signed in: `from`, only a path in this app, as
 * after signing in with the password. Not signed in: the sign-in page with
 * BetterAuth's `?error=`, keeping `from` for the next attempt.
 */
export const googleCallbackUrls = (from?: string) => {
  const errorCallbackURL = new URL(ROUTES.login, window.location.origin)
  if (from) errorCallbackURL.searchParams.set("from", from)
  return {
    callbackURL: new URL(safeRedirect(from, ROUTES.events), window.location.origin).toString(),
    errorCallbackURL: errorCallbackURL.toString(),
  }
}
