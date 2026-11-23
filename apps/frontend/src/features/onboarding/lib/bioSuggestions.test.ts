import { describe, expect, it } from "vitest"

import { BIO_MAX_LENGTH, createBioSuggestions, nextBioSuggestionIndex } from "./bioSuggestions"

const exampleProfile = {
  displayName: "Alex Veselý",
  localityName: "Praha 5",
  activityNames: ["Stolní tenis", "RPG (D&D apod.)", "CrossFit"],
}

describe("createBioSuggestions", () => {
  it("offers 60 distinct drafts and mixes tones from the first suggestions", () => {
    const suggestions = createBioSuggestions(exampleProfile)

    expect(suggestions).toHaveLength(60)
    expect(new Set(suggestions.map(({ id }) => id)).size).toBe(60)
    expect(new Set(suggestions.map(({ text }) => text)).size).toBe(60)
    expect(suggestions.slice(0, 5).map(({ tone }) => tone)).toEqual([
      "natural",
      "social",
      "playful",
      "short",
      "curious",
    ])
  })

  it("speaks in the profile owner's voice and preserves catalog brands", () => {
    const suggestions = createBioSuggestions(exampleProfile)

    expect(suggestions[0]?.text).toMatch(
      /^Ahoj, jsem Alex Veselý\. Ve volném čase mě baví stolní tenis, RPG \(D&D apod\.\) a\sCrossFit\./,
    )
    expect(suggestions[4]?.text).toContain("v okolí (Praha 5)")
    expect(suggestions).toEqual(createBioSuggestions(exampleProfile))
  })

  it("offers a complete set of usable drafts even with no account or catalog labels", () => {
    const suggestions = createBioSuggestions({ activityNames: [] })

    expect(suggestions).toHaveLength(60)
    expect(new Set(suggestions.map(({ text }) => text)).size).toBe(60)
    for (const { text } of suggestions) {
      expect(text).toMatch(/^\S.*[.?!]$/)
      expect(text).not.toMatch(/undefined|null|\(\)| {2}/)
    }
  })

  it("normalizes labels and ignores duplicates and activities beyond the first three", () => {
    const [first] = createBioSuggestions({
      displayName: "  Alex\tVeselý  ",
      localityName: " Praha\r\n5 ",
      activityNames: ["Deskové hry", " deskové hry", "", "   ", "Běh", "Tenis", "Squash"],
    })

    expect(first?.text).toContain("Ahoj, jsem Alex Veselý.")
    expect(first?.text).toMatch(/deskové hry, běh a\stenis\./)
    expect(first?.text).not.toContain("squash")
  })

  // review #384: „volejbal, florbal a fotbal a malá kopaná“ read as four things joined badly
  it.each([
    [["Volejbal", "Florbal", "Fotbal a malá kopaná"], "volejbal, florbal i fotbal a malá kopaná"],
    [["Fotbal a malá kopaná", "Volejbal", "Florbal"], "fotbal a malá kopaná, volejbal i florbal"],
    [["Box a kickbox", "Lezení a bouldering"], "box a kickbox i lezení a bouldering"],
    [["Fotbal a malá kopaná"], "fotbal a malá kopaná"],
  ])("never chains two „a“ when an activity name has its own (%j)", (activityNames, list) => {
    const suggestions = createBioSuggestions({ activityNames })

    expect(suggestions[0]?.text).toContain(`Ve volném čase mě baví ${list}.`)
    for (const { text } of suggestions) {
      expect(text).not.toMatch(/(volejbal|florbal|kickbox) a (fotbal|lezení) a/u)
    }
  })

  it("leaves account punctuation alone and appends no duplicate stops", () => {
    const suggestions = createBioSuggestions({ displayName: "Alex.", activityNames: [] })

    expect(suggestions[0]?.text).toContain("Ahoj, jsem Alex. Ve")
    expect(suggestions[1]?.text).toContain("Jsem Alex. Hledám")
    expect(suggestions[3]?.text).toBe("Tady Alex. Na které akci se potkáme?")
  })

  it("keeps all drafts editable within the same character limit as the profile", () => {
    const labelsAtLimit = createBioSuggestions({
      displayName: "Ž".repeat(80),
      localityName: "č".repeat(80),
      activityNames: ["a".repeat(72), "b".repeat(72), "c".repeat(72)],
    })
    const unusableLabels = createBioSuggestions({
      displayName: "Ž".repeat(501),
      localityName: "č".repeat(501),
      activityNames: ["a".repeat(501)],
    })

    for (const { text } of [...labelsAtLimit, ...unusableLabels]) {
      expect(text.length).toBeGreaterThan(0)
      expect(text.length).toBeLessThanOrEqual(BIO_MAX_LENGTH)
    }
    expect(unusableLabels).toEqual(createBioSuggestions({ activityNames: [] }))
  })
})

describe("nextBioSuggestionIndex", () => {
  it("visits every draft once before cycling back to the starting index", () => {
    const suggestions = createBioSuggestions(exampleProfile)
    const visited: number[] = []
    let index = 0

    for (const _ of suggestions) {
      visited.push(index)
      index = nextBioSuggestionIndex(index, 1, suggestions.length)
    }

    expect(new Set(visited).size).toBe(suggestions.length)
    expect(index).toBe(0)
  })

  it("cycles backwards from the first draft and forwards from the last", () => {
    expect(nextBioSuggestionIndex(0, -1, 60)).toBe(59)
    expect(nextBioSuggestionIndex(59, 1, 60)).toBe(0)
    expect(nextBioSuggestionIndex(12, -1, 60)).toBe(11)
  })

  it("keeps a valid index if entries are empty, reduced, or the cursor is stale", () => {
    expect(nextBioSuggestionIndex(2, 1, 0)).toBe(0)
    expect(nextBioSuggestionIndex(1, 1, 1)).toBe(0)
    expect(nextBioSuggestionIndex(59, 1, 5)).toBe(0)
    expect(nextBioSuggestionIndex(-2, -1, 5)).toBe(2)
    expect(nextBioSuggestionIndex(-4, -1, 5)).toBe(0)
    expect(nextBioSuggestionIndex(Number.NaN, 1, 5)).toBe(1)
  })
})
