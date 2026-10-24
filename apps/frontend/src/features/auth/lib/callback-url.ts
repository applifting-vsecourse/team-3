import { ROUTES } from "@/app/routes"

/**
 * Where the link in the verification e-mail leads once it has verified the
 * address. Absolute: the link goes through the backend first, and without it
 * BetterAuth would send the user to the backend's own „/“.
 */
export const afterVerificationUrl = () => new URL(ROUTES.events, window.location.origin).toString()
