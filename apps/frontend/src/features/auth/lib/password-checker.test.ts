import { describe, expect, it } from "vitest"

import {
  describePasswordStrength,
  passwordUserInputs,
  type PasswordStrength,
} from "@/features/auth/lib/password"
import { checkPassword } from "@/features/auth/lib/password-checker"

// The real estimator with its dictionaries. The examples sit well clear of the
// lines between levels (10⁸ and 10¹⁰ guesses), so a dictionary update doesn't
// flip them.
const jana = passwordUserInputs("Jana Nováková", "jana.novakova@example.com")

const strength = (password: string, userInputs: string[] = []) =>
  describePasswordStrength(password, checkPassword(password, userInputs))

const level = (password: string, userInputs: string[] = []) => strength(password, userInputs)?.level

describe("checkPassword (#153)", () => {
  it("rates the passwords attackers try first weak, though they pass B-010", () => {
    for (const password of ["heslo12345", "heslo123456789", "qwertzuiop1", "kolo123456"]) {
      expect(level(password), password).toBe("weak")
    }
  })

  it("rates a password made of the user's name, e-mail or the site weak", () => {
    expect(level("hobbyhub2026", jana)).toBe("weak")
    expect(level("Novakova2026", jana)).toBe("weak")
    expect(level("jana.novakova1", jana)).toBe("weak")
  })

  it("rates uncommon words good, and random characters or a phrase strong", () => {
    expect(level("kolo2026jede")).toBe("good")
    expect(level("mlok3jezero")).toBe("good")
    expect(level("x8vT2mQ9rL4z")).toBe("strong")
    expect(level("mojekočkamícu5")).toBe("strong")
    expect(level("kolo jede po silnici 7")).toBe("strong")
  })

  it("a phrase without a digit is weak all the same: the rule (B-010) comes first", () => {
    expect(strength("correct horse battery staple", jana)).toEqual({
      level: "weak",
      hint: "Přidej číslici.",
    })
  })

  it("says why a weak one is weak, in Czech", () => {
    expect(strength("qwertzuiop1")?.hint).toMatch(/^Řada kláves vedle sebe se dá snadno uhodnout\./)
    expect(strength("hobbyhub2026", jana)?.hint).toBe(
      "Heslo by nemělo obsahovat tvé jméno, e-mail ani název HobbyHubu. Přidej další, méně běžné slovo.",
    )
    expect(strength("heslo12345")?.hint).toBe("Přidej další, méně běžné slovo.")
  })

  it("more of what an attacker guesses doesn't help; another word or a symbol does", () => {
    const order: PasswordStrength[] = ["weak", "good", "strong"]
    const rise = (passwords: string[]) =>
      passwords.map((password) => order.indexOf(level(password) ?? "weak"))

    // more digits: still weak
    expect(rise(["heslo12345", "heslo123456789"])).toEqual([0, 0])
    // words: weak → good → strong
    expect(rise(["kolo123456", "kolo2026jede", "kolo jede po silnici 7"])).toEqual([0, 1, 2])
    // a symbol or another word: up, never down
    expect(rise(["kolo2026jede", "kolo2026jede!"])).toEqual([1, 2])
    expect(rise(["heslo12345", "heslo12345!kolo"])).toEqual([0, 2])
    expect(rise(["x8vT2mQ9rL4z", "x8vT2mQ9rL4z!"])).toEqual([2, 2])
  })
})
