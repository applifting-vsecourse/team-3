import { afterEach, describe, expect, it, vi } from "vitest"

import { api, apiValidationMessages } from "@/lib/api-client"

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

  it("a rate limit (429) shows the API's Czech message", async () => {
    // the body of @nestjs/throttler's ThrottlerException with our message (#230)
    respond(429, {
      statusCode: 429,
      message: "Nových akcí a skupin je teď moc. Zkus to znovu později.",
    })

    await expect(api.post("events").json()).rejects.toThrow(
      /^Nových akcí a skupin je teď moc\. Zkus to znovu později\.$/,
    )
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

// #281 (review #395): the messages a form puts under its fields
describe("apiValidationMessages", () => {
  const refusal = async (status: number, body: unknown) => {
    respond(status, body)
    return api
      .post("events/e1/messages")
      .json()
      .catch((error: unknown) => error)
  }

  it("a 400's validation messages, one per field", async () => {
    expect(
      apiValidationMessages(
        await refusal(400, { message: ["Napiš předmět", "Napiš text zprávy"] }),
      ),
    ).toEqual(["Napiš předmět", "Napiš text zprávy"])
    expect(apiValidationMessages(await refusal(400, { message: "Napiš předmět" }))).toEqual([
      "Napiš předmět",
    ])
  })

  it("nothing for another refusal or another error", async () => {
    expect(
      apiValidationMessages(await refusal(429, { code: "MESSAGE_LIMIT", message: "Dnes už ne." })),
    ).toEqual([])
    expect(apiValidationMessages(new Error("offline"))).toEqual([])
  })
})
