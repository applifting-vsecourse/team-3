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

  it("without a JSON message ky's own message stays", async () => {
    respond(502, "Bad gateway", "text/plain")

    await expect(api.get("events").json()).rejects.toThrow(/status code 502/)
  })
})
