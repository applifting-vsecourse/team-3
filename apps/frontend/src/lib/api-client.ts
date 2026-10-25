import ky, { HTTPError, NetworkError, TimeoutError } from "ky"

import { env } from "@/config/env"
import { queryClient } from "@/config/react-query"
import { authKeys } from "@/lib/auth-keys"

// Single shared HTTP client. Per the Applifting frontend playbook:
// - send credentials so better-auth's session cookie travels with every request
// - on 401 invalidate the auth session query so route loaders re-resolve auth
//   and redirect through the login flow
// - turn API errors into readable messages (see beforeError below)
//
// Paths are joined onto `prefix`, and a leading slash is normalised away, so
// both `api.get("events")` and `api.get("/events")` hit the same endpoint.
export const api = ky.create({
  prefix: env.VITE_API_URL,
  credentials: "include",
  retry: { limit: 0 },
  hooks: {
    // NestJS returns { message: string | string[] } on validation failures and
    // the API's refusals carry a Czech message („Akce je plná.“). Without this
    // the user would see ky's generic "Request failed with status code 400"
    // and never learn what was actually wrong. Ky 2 has already read the body
    // into `error.data` (the response itself can't be read again). What the API
    // can't explain in Czech (no network, timeout, 5xx, expired session) gets a
    // Czech sentence instead of ky's English one with the URL.
    beforeError: [
      ({ error }) => {
        if (error instanceof NetworkError) error.message = FALLBACK.network
        else if (error instanceof TimeoutError) error.message = FALLBACK.timeout
        else if (error instanceof HTTPError) error.message = httpErrorMessage(error)
        return error
      },
    ],
    afterResponse: [
      ({ response }) => {
        if (response.status === 401) {
          void queryClient.invalidateQueries({ queryKey: authKeys.session() })
        }
      },
    ],
  },
})

const FALLBACK = {
  network: "Nepodařilo se spojit se serverem. Zkontroluj připojení a zkus to znovu.",
  timeout: "Server neodpověděl včas. Zkus to znovu.",
  server: "Něco se pokazilo na naší straně. Zkus to znovu.",
  signedOut: "Přihlášení vypršelo. Přihlas se znovu.",
}

/** The API's own message (a string, or NestJS validation's string[]), if it sent one. */
const apiMessage = (data: unknown): string | undefined => {
  if (typeof data !== "object" || data === null || !("message" in data)) return undefined
  const { message } = data
  const text = Array.isArray(message)
    ? message.filter((part): part is string => typeof part === "string").join(", ")
    : message
  return typeof text === "string" && text ? text : undefined
}

const httpErrorMessage = (error: HTTPError): string => {
  const { status } = error.response
  // Nest's defaults here are English („Unauthorized“, „Internal server error“)
  if (status === 401) return FALLBACK.signedOut
  if (status >= 500) return FALLBACK.server
  return apiMessage(error.data) ?? `Něco se nepovedlo (chyba ${status}). Zkus to znovu.`
}

export { HTTPError }
