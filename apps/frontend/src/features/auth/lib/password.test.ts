import { describe, expect, it } from "vitest"

import {
  describePasswordStrength,
  missingForRule,
  PASSWORD_RULE,
  passwordSchema,
  passwordUserInputs,
  strengthBars,
  strengthLevel,
  type PasswordCheck,
  type PasswordScore,
} from "@/features/auth/lib/password"

const SCORES: PasswordScore[] = [0, 1, 2, 3, 4]

describe("passwordSchema (B-010)", () => {
  it("accepts 10 characters with a letter and a digit, Czech letters too", () => {
    expect(passwordSchema.safeParse("hobbyhub26").success).toBe(true)
    expect(passwordSchema.safeParse("žluťoučký1").success).toBe(true)
  })

  it("refuses a short one, one without a digit and one without a letter, saying the rule", () => {
    for (const weak of ["hobbyhub2", "hobbyhubhobbyhub", "1234567890"]) {
      const result = passwordSchema.safeParse(weak)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe(PASSWORD_RULE)
    }
  })
})

describe("strengthLevel (#153)", () => {
  it("is weak for a password the rule refuses, whatever the score", () => {
    // a long phrase scores 4, but without a digit the API refuses it
    for (const password of ["heslo", "abcdefghi", "correct horse battery staple", "1234567890"]) {
      for (const score of SCORES) expect(strengthLevel(password, score)).toBe("weak")
    }
  })

  it("follows the score once the rule is met: up to 2 weak, 3 good, 4 strong", () => {
    expect(SCORES.map((score) => strengthLevel("heslo12345", score))).toEqual([
      "weak",
      "weak",
      "weak",
      "good",
      "strong",
    ])
  })
})

describe("missingForRule (#153)", () => {
  it("says what the password lacks to pass B-010", () => {
    expect(missingForRule("heslo")).toBe("Ještě 5 znaků. Přidej číslici.")
    expect(missingForRule("abcdefghi")).toBe("Ještě 1 znak. Přidej číslici.")
    expect(missingForRule("abcdefg1")).toBe("Ještě 2 znaky.")
    expect(missingForRule("correct horse battery staple")).toBe("Přidej číslici.")
    expect(missingForRule("1234567890")).toBe("Přidej písmeno.")
    expect(missingForRule("!")).toBe("Ještě 9 znaků. Přidej číslici. Přidej písmeno.")
  })

  it("is null once it passes", () => {
    expect(missingForRule("heslo12345")).toBeNull()
    expect(missingForRule("žluťoučký1")).toBeNull()
  })

  it("counts characters as people see them: an emoji is one", () => {
    expect(missingForRule("a1😀")).toBe("Ještě 7 znaků.")
  })
})

describe("describePasswordStrength (#153)", () => {
  const check = (
    score: PasswordScore,
    warning: string | null = null,
    suggestions: string[] = [],
  ) => ({
    score,
    warning,
    suggestions,
  })

  it("says nothing for an empty field", () => {
    expect(describePasswordStrength("", check(4))).toBeNull()
  })

  it("until the rule is met: weak and what's missing, without waiting for the estimator", () => {
    expect(describePasswordStrength("heslo", null)).toEqual({
      level: "weak",
      hint: "Ještě 5 znaků. Přidej číslici.",
    })
    // the estimator likes the phrase; the rule doesn't
    expect(describePasswordStrength("correct horse battery staple", check(4))).toEqual({
      level: "weak",
      hint: "Přidej číslici.",
    })
  })

  it("no guess while the estimator is loading or failed to load", () => {
    expect(describePasswordStrength("heslo12345", null)).toBeNull()
  })

  it("weak: the estimator's warning and its first suggestion", () => {
    expect(
      describePasswordStrength(
        "qwertzuiop1",
        check(1, "Řada kláves vedle sebe se dá snadno uhodnout.", [
          "Přidej další, méně běžné slovo.",
          "Vynech obrazce z klávesnice.",
        ]),
      ),
    ).toEqual({
      level: "weak",
      hint: "Řada kláves vedle sebe se dá snadno uhodnout. Přidej další, méně běžné slovo.",
    })
    expect(
      describePasswordStrength("heslo12345", check(1, null, ["Přidej další, méně běžné slovo."])),
    ).toEqual({ level: "weak", hint: "Přidej další, méně běžné slovo." })
    expect(describePasswordStrength("heslo12345", check(2))).toEqual({ level: "weak", hint: null })
  })

  it("good: how to make it stronger; strong: no advice", () => {
    expect(describePasswordStrength("kolo2026jede", check(3))).toEqual({
      level: "good",
      hint: "Silnější bude s dalším slovem.",
    })
    expect(describePasswordStrength("x8vT2mQ9rL4z", check(4))).toEqual({
      level: "strong",
      hint: null,
    })
  })
})

describe("passwordUserInputs (#153)", () => {
  it("takes the name, the e-mail and the site's words, with and without diacritics", () => {
    const inputs = passwordUserInputs("Jana Nováková", "jana.novakova@example.com")

    expect(inputs).toEqual(
      expect.arrayContaining([
        "jana",
        "nováková",
        "novakova",
        "jananovakova",
        "jana.novakova",
        "hobbyhub",
        "hobby",
        "akce",
      ]),
    )
    // lower case, each once, nothing shorter than 3 characters, not the domain
    expect(new Set(inputs).size).toBe(inputs.length)
    expect(inputs.every((word) => word === word.toLowerCase() && [...word].length >= 3)).toBe(true)
    expect(inputs).not.toContain("example")
  })

  it("splits a name at dots, hyphens and apostrophes, and the e-mail at anything but letters and digits", () => {
    const inputs = passwordUserInputs("Marie-Anne O’Brien", "m_obrien+hh@example.com")

    expect(inputs).toEqual(
      expect.arrayContaining(["marie", "anne", "brien", "obrien", "m_obrien+hh"]),
    )
  })

  it("still has the site's words before anything is filled in", () => {
    expect(passwordUserInputs("", "")).toEqual(["hobbyhub", "hobby", "hub", "akce"])
  })
})

describe("strengthBars (#153)", () => {
  const check = (score: PasswordScore): PasswordCheck => ({ score, warning: null, suggestions: [] })

  it("follows zxcvbn's score, so a better weak password fills more of the bar", () => {
    expect(strengthBars("heslo12345", check(0))).toBe(1)
    expect(strengthBars("heslo12345", check(1))).toBe(1)
    expect(strengthBars("Martin1990!#", check(2))).toBe(2)
    expect(strengthBars("kolo2026jede", check(3))).toBe(3)
    expect(strengthBars("kolo2026jede!", check(4))).toBe(4)
  })

  it("one part for a password the API would refuse, nothing for an empty field or no verdict yet", () => {
    expect(strengthBars("correct horse battery staple", check(4))).toBe(1)
    expect(strengthBars("", check(4))).toBeNull()
    expect(strengthBars("heslo12345", null)).toBeNull()
  })
})
