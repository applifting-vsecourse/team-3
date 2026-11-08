import { describe, expect, it } from "vitest"

import { inSentence } from "./inSentence"

describe("inSentence", () => {
  it.each([
    ["Florbal", "florbal"],
    ["Deskové hry", "deskové hry"],
    ["Běh na Petříně", "běh na Petříně"],
    ["Sešlo se 6 lidí", "sešlo se 6 lidí"],
    ["Pá 23. 10.", "pá 23. 10."],
    ["Úterý", "úterý"],
  ])("„%s“ → „%s“", (text, expected) => {
    expect(inSentence(text)).toBe(expected)
  })

  it.each(["RPG (D&D apod.)", "CrossFit", "DnD", "TRX"])(
    "keeps an acronym or a brand: „%s“",
    (text) => {
      expect(inSentence(text)).toBe(text)
    },
  )

  it("leaves an empty text empty", () => {
    expect(inSentence("")).toBe("")
  })
})
