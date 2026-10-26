import { describe, expect, it } from "vitest"

import { foldText, matchRank } from "./textSearch"

describe("foldText", () => {
  it("drops case and diacritics, so a query typed without them matches", () => {
    expect(foldText("Ústí nad Orlicí")).toBe("usti nad orlici")
    expect(foldText("ZLÍN")).toBe("zlin")
    expect(foldText("Šipky a bowling")).toBe("sipky a bowling")
  })

  it("reads a dash and extra spaces as one space", () => {
    expect(foldText("Frýdek-Místek")).toBe("frydek mistek")
    expect(foldText("  praha   8 ")).toBe("praha 8")
  })
})

describe("matchRank", () => {
  it("ranks the start of the text over the start of a word over the middle", () => {
    expect(matchRank("usti nad orlici", "usti")).toBe(0)
    expect(matchRank("sezimovo usti", "usti")).toBe(1)
    expect(matchRank("hustopece", "ust")).toBe(2)
    expect(matchRank("zlin", "brno")).toBeUndefined()
  })
})
