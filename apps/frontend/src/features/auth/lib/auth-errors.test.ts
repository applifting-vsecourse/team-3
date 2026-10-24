import { describe, expect, it } from "vitest"

import { authErrorMessage, toAuthRequestError } from "@/features/auth/lib/auth-errors"

describe("authErrorMessage", () => {
  it("turns BetterAuth's codes into Czech", () => {
    expect(authErrorMessage({ code: "INVALID_TOKEN", message: "Invalid token" }, "x")).toBe(
      "Odkaz je neplatný, nebo už vypršel. Pošlete si prosím nový.",
    )
    expect(authErrorMessage({ code: "PASSWORD_TOO_SHORT" }, "x")).toBe("Heslo je příliš krátké.")
  })

  it("a rate limit (429) asks to wait, whatever the code", () => {
    expect(authErrorMessage({ status: 429, message: "Too many requests" }, "x")).toBe(
      "Příliš mnoho pokusů. Zkuste to prosím za minutu.",
    )
  })

  it("an unknown error gets the caller's Czech fallback, never the English message", () => {
    expect(
      authErrorMessage({ code: "SOMETHING_NEW", message: "Something new" }, "Nepovedlo se."),
    ).toBe("Nepovedlo se.")
  })

  it("the thrown error keeps the code to react to", () => {
    const error = toAuthRequestError({ code: "TOKEN_EXPIRED" }, "x")
    expect(error.message).toBe("Odkaz už vypršel. Pošlete si prosím nový.")
    expect(error.code).toBe("TOKEN_EXPIRED")
  })
})
