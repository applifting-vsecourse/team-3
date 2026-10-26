import { describe, expect, it } from "vitest"

import { authErrorMessage, toAuthRequestError } from "@/features/auth/lib/auth-errors"

describe("authErrorMessage", () => {
  it("turns BetterAuth's codes into Czech", () => {
    expect(authErrorMessage({ code: "INVALID_TOKEN", message: "Invalid token" }, "x")).toBe(
      "Odkaz je neplatný, nebo už vypršel. Pošli si prosím nový.",
    )
    expect(authErrorMessage({ code: "PASSWORD_TOO_SHORT" }, "x")).toBe("Heslo je příliš krátké.")
  })

  it("a wrong e-mail and a wrong password read the same (#37)", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" }, "x")).toBe(
      "Nesprávný e-mail nebo heslo.",
    )
  })

  it("a weak password from the API says the rule (B-010)", () => {
    expect(authErrorMessage({ code: "WEAK_PASSWORD", message: "Heslo musí…" }, "x")).toBe(
      "Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici.",
    )
  })

  it("a name the API refuses says which character doesn't belong (#153)", () => {
    expect(
      authErrorMessage(
        { code: "INVALID_NAME", message: "Znak „<“ do jména nepatří. Jméno může obsahovat…" },
        "x",
      ),
    ).toBe("Znak „<“ do jména nepatří. Jméno může obsahovat…")
    expect(authErrorMessage({ code: "INVALID_NAME" }, "x")).toBe(
      "Jméno může obsahovat jen písmena, mezery, pomlčky, apostrofy a tečky.",
    )
  })

  it("a sign-up without the consents says both are needed (#153)", () => {
    expect(authErrorMessage({ code: "CONSENT_REQUIRED", message: "…" }, "x")).toMatch(
      /^K registraci je potřeba souhlas s podmínkami užívání/,
    )
  })

  it("a rate limit (429) asks to wait, whatever the code", () => {
    expect(authErrorMessage({ status: 429, message: "Too many requests" }, "x")).toBe(
      "Příliš mnoho pokusů. Zkus to prosím za minutu.",
    )
  })

  it("an unknown error gets the caller's Czech fallback, never the English message", () => {
    expect(
      authErrorMessage({ code: "SOMETHING_NEW", message: "Something new" }, "Nepovedlo se."),
    ).toBe("Nepovedlo se.")
  })

  it("the thrown error keeps the code to react to", () => {
    const error = toAuthRequestError({ code: "TOKEN_EXPIRED" }, "x")
    expect(error.message).toBe("Odkaz už vypršel. Pošli si prosím nový.")
    expect(error.code).toBe("TOKEN_EXPIRED")
  })
})
