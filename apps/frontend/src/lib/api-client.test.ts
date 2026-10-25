import { afterEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"

// The real client against a stubbed fetch: what the user reads in a toast
// when the API refuses (ky 2 reads the body before the hook runs).
const respond = (status: number, body: unknown, contentType = "application/json") =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": contentType },
    }),
  )

afterEach(() => {
  vi.restoreAllMocks()
})

describe("api client errors", () => {
  it("a refusal shows the API's Czech message, not ky's status line", async () => {
    respond(409, { code: "EVENT_FULL", message: "Akce je plná." })

    await expect(api.post("events/e1/participation").json()).rejects.toThrow(/^Akce je plná\.$/)
  })

  it("validation messages (an array) are joined", async () => {
    respond(400, { message: ["Vyplň název akce", "Akce potřebuje aktivitu"] })

    await expect(api.post("events").json()).rejects.toThrow(
      "Vyplň název akce, Akce potřebuje aktivitu",
    )
  })

  it("a refusal without a usable message says so in Czech, with the status", async () => {
    respond(404, { message: 42 })

    await expect(api.get("events/x").json()).rejects.toThrow(
      "Něco se nepovedlo (chyba 404). Zkus to znovu.",
    )
  })

  it("a server error (any 5xx, JSON or not) doesn't show Nest's English default", async () => {
    respond(500, { statusCode: 500, message: "Internal server error" })
    await expect(api.get("events").json()).rejects.toThrow(
      "Něco se pokazilo na naší straně. Zkus to znovu.",
    )

    respond(502, "Bad gateway", "text/plain")
    await expect(api.get("events").json()).rejects.toThrow(
      "Něco se pokazilo na naší straně. Zkus to znovu.",
    )
  })

  it("an expired session (401 „Unauthorized“) asks to sign in again", async () => {
    respond(401, { statusCode: 401, message: "Unauthorized" })

    await expect(api.post("events/e1/participation").json()).rejects.toThrow(
      "Přihlášení vypršelo. Přihlas se znovu.",
    )
  })

  it("no connection: a Czech sentence, not ky's message with the URL", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"))

    await expect(api.get("events").json()).rejects.toThrow(
      "Nepodařilo se spojit se serverem. Zkontroluj připojení a zkus to znovu.",
    )
  })
})
