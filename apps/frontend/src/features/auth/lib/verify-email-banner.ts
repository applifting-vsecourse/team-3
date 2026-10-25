/** The banner „Ověř si e-mail“ (#58), for the pages that lead to it. */
export const VERIFY_EMAIL_BANNER_ID = "overeni-emailu"

/**
 * Brings the banner into view and the focus onto it, where the link is sent
 * again or opened. It isn't sticky: e.g. under an event on a phone it has
 * scrolled away. No `#hash` link: that would add a history entry, and „Zpět“
 * would then lead to the same page.
 */
export function showVerifyEmailBanner() {
  const banner = document.getElementById(VERIFY_EMAIL_BANNER_ID)
  banner?.scrollIntoView({ block: "start" })
  banner?.focus({ preventScroll: true })
}
