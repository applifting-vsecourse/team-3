import { ROUTES } from "@/app/routes"

/**
 * Where the link in the verification e-mail leads once it has checked the
 * token: the page that says whether it worked (BetterAuth adds `?error=` when
 * it didn't). Absolute: the link goes through the backend first, and without
 * it BetterAuth would send the user to the backend's own „/“.
 */
export const afterVerificationUrl = (from?: string) => {
  const url = new URL(ROUTES.emailVerified, window.location.origin)
  // „Pokračovat“ there leads back where the sign-up started, e.g. the event (B-012)
  if (from) url.searchParams.set("from", from)
  return url.toString()
}
