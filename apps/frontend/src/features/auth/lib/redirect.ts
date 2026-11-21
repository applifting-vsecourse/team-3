import type { ParsedLocation } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { backLabel } from "@/components/BackLink/backTarget"

/**
 * The `from` that leads back to this page after signing in (B-012): the raw
 * href, search included (`/akce?lokalita=praha-8`). Not encoded here — the
 * router encodes search values once when it writes the URL and decodes them
 * once when it reads it, as does URLSearchParams in the e-mail links. Encoding
 * here too gave `?from=%252Fmoje-akce` (#186).
 */
export const redirectFrom = (location: ParsedLocation) => location.href

// A path in this app: not `https://…`, not `//host` (protocol-relative), and
// no backslash or control character a browser could turn into either.
const isAppPath = (path: string) =>
  path.startsWith("/") && !path.startsWith("//") && !/[\\\p{Cc}]/u.test(path)

// Signed in, these pages send you on to `from`: pointing at them would loop.
const isAuthPage = (path: string) => /^\/(login|signup)(?:[/?#]|$)/.test(path)

/**
 * Before #186 `from` was encoded twice, so after the router's decoding it
 * still read `%2Fakce…`; verification e-mails sent then still carry it. A
 * path starts with "/", so only such a leftover is decoded once more — a
 * real path is used as it is, or its own `%26` in a filter would turn into `&`.
 * Remove once those links have expired: they are valid for 24 hours.
 */
const fromLegacyEncoding = (from: string) => {
  if (from.startsWith("/")) return from
  try {
    return decodeURIComponent(from)
  } catch {
    return from
  }
}

/**
 * Where to go back to after signing in or up (B-012): the page `from`
 * names, or `fallback`. `from` is what the router read from the URL, already
 * decoded. Only a path in this app, so a crafted link
 * (`?from=https://evil.com`) can't send the user away.
 */
export const safeRedirect = (from: string | undefined, fallback: string): string => {
  if (!from) return fallback
  const path = fromLegacyEncoding(from)
  return isAppPath(path) && !isAuthPage(path) ? path : fallback
}

// The pages of signing in and its side steps: coming back to one of them after signing in
// makes no sense, so a link to sign in from there passes on their own `from` (#370).
const isAccountPage = (path: string) =>
  /^\/(login|signup|zapomenute-heslo|reset-password|email-overen)(?:[/?#]|$)/.test(path)

/**
 * `from` for „Přihlásit se“ and „Registrovat“ in the header and the bottom navigation
 * (#370, B-012): this page with its search (an event, a group, /akce with its filters), so
 * signing in comes back here. On the sign-in pages themselves their own `from`, if any —
 * never `/login?from=/login`.
 */
export const authLinkFrom = (location: ParsedLocation): string | undefined => {
  if (!isAccountPage(location.pathname)) return redirectFrom(location)
  const { from } = location.search as { from?: unknown }
  return typeof from === "string" ? from : undefined
}

/**
 * The back link of the sign-in and sign-up pages (#370, N9): with history it goes back and
 * names the page; opened from a link it leads to `from` — the page signing in returns to —
 * or to the landing page.
 */
export const authBackLink = (from: string | undefined) => {
  const href = safeRedirect(from, ROUTES.home)
  return { href, fallbackLabel: backLabel(href.split(/[?#]/)[0]) ?? "Zpět" }
}
