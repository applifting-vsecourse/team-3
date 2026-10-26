import { describe, expect, it } from "vitest"

import { nameProblem, nameSchema } from "@/features/auth/lib/name"

const WHAT_IS_ALLOWED = "Jméno může obsahovat jen písmena, mezery, pomlčky, apostrofy a tečky."

describe("nameProblem (#153, the API's rule)", () => {
  it("accepts letters with diacritics, a space, a hyphen, an apostrophe and a dot", () => {
    for (const name of [
      "Jo",
      "Jana Malá",
      "Žofie Řeháková-Štěpánková",
      "Seán O'Connor",
      "D’Artagnan",
      "J. R. R. Tolkien",
      "Ольга",
      "ř".repeat(60),
    ]) {
      expect(nameProblem(name)).toBeNull()
    }
  })

  it("names the character that doesn't belong: <, >, a digit, an emoji", () => {
    expect(nameProblem("Jana <b>")).toBe(`Znak „<“ do jména nepatří. ${WHAT_IS_ALLOWED}`)
    expect(nameProblem("Jana > Petr")).toMatch(/^Znak „>“/)
    expect(nameProblem("Petr2")).toMatch(/^Znak „2“/)
    expect(nameProblem("Jana 😀")).toMatch(/^Znak „😀“/)
  })

  it("refuses control and invisible characters without quoting them", () => {
    for (const name of ["Jana\nMalá", "Jana\tMalá", "Jana\u0000", "Jana‍Malá"]) {
      expect(nameProblem(name)).toMatch(/^Jméno obsahuje neviditelný znak/)
    }
  })

  it("wants 2 to 60 characters and a letter", () => {
    expect(nameProblem("J")).toBe("Jméno musí mít aspoň 2 znaky.")
    expect(nameProblem("a".repeat(61))).toBe("Jméno může mít nejvýš 60 znaků.")
    expect(nameProblem("--")).toBe("Jméno musí obsahovat aspoň jedno písmeno.")
  })
})

describe("nameSchema", () => {
  const firstMessage = (name: string) => nameSchema.safeParse(name).error?.issues[0]?.message

  it("asks for a name first, then says what's wrong with it", () => {
    expect(firstMessage("  ")).toBe("Vyplň jméno")
    expect(firstMessage("Jana2")).toMatch(/^Znak „2“/)
  })

  it("trims the spaces around", () => {
    expect(nameSchema.parse("  Jana Malá ")).toBe("Jana Malá")
  })
})
