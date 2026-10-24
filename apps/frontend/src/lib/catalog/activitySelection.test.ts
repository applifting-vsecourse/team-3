import { describe, expect, it } from "vitest"

import type { ActivityCategory } from "@/lib/catalog/catalogSchemas"

import {
  categoryState,
  isActivityChecked,
  searchActivities,
  selectionLabel,
  toggleActivity,
  toggleCategory,
  type ActivitySelection,
} from "./activitySelection"

const activity = (slug: string, name: string, keywords: string[] = []) => ({
  id: `a-${slug}`,
  slug,
  name,
  keywords,
})

const teamSports: ActivityCategory = {
  id: "c-tymove",
  slug: "tymove-sporty",
  name: "Týmové sporty",
  icon: "ball",
  activities: [
    activity("florbal", "Florbal"),
    activity("volejbal", "Volejbal"),
    activity("nohejbal", "Nohejbal", ["nohec"]),
  ],
}
const rackets: ActivityCategory = {
  id: "c-raketove",
  slug: "raketove-sporty",
  name: "Raketové sporty",
  icon: "racket",
  activities: [activity("stolni-tenis", "Stolní tenis", ["pinčes", "ping-pong"])],
}
const [florbal, volejbal, nohejbal] = teamSports.activities as [
  ReturnType<typeof activity>,
  ReturnType<typeof activity>,
  ReturnType<typeof activity>,
]
const none: ActivitySelection = { categories: [], activities: [] }

describe("categoryState", () => {
  it("off, half-checked with some activities, on for the whole category", () => {
    expect(categoryState(none, teamSports)).toBe("off")
    expect(categoryState({ categories: [], activities: ["florbal"] }, teamSports)).toBe("mixed")
    expect(categoryState({ categories: ["tymove-sporty"], activities: [] }, teamSports)).toBe("on")
  })
})

describe("toggleCategory", () => {
  it("selects the whole category by its slug (activities added later included)", () => {
    expect(toggleCategory(none, teamSports)).toEqual({
      categories: ["tymove-sporty"],
      activities: [],
    })
  })

  it("a half-checked category becomes whole, its single activities are dropped", () => {
    const selection = { categories: [], activities: ["florbal", "stolni-tenis"] }
    expect(toggleCategory(selection, teamSports)).toEqual({
      categories: ["tymove-sporty"],
      activities: ["stolni-tenis"],
    })
  })

  it("unchecking clears it", () => {
    expect(toggleCategory({ categories: ["tymove-sporty"], activities: [] }, teamSports)).toEqual(
      none,
    )
  })
})

describe("toggleActivity", () => {
  it("adds and removes a single activity", () => {
    const one = toggleActivity(none, teamSports, florbal)
    expect(one).toEqual({ categories: [], activities: ["florbal"] })
    expect(toggleActivity(one, teamSports, florbal)).toEqual(none)
  })

  it("unchecking one activity of a whole category keeps the others", () => {
    const whole = { categories: ["tymove-sporty"], activities: [] }
    expect(toggleActivity(whole, teamSports, volejbal)).toEqual({
      categories: [],
      activities: ["florbal", "nohejbal"],
    })
  })

  it("picking every activity one by one is the whole category", () => {
    const two = { categories: [], activities: ["florbal", "volejbal"] }
    expect(toggleActivity(two, teamSports, nohejbal)).toEqual({
      categories: ["tymove-sporty"],
      activities: [],
    })
  })

  it("an activity of a whole category counts as checked", () => {
    expect(
      isActivityChecked({ categories: ["tymove-sporty"], activities: [] }, teamSports, nohejbal),
    ).toBe(true)
  })
})

describe("selectionLabel", () => {
  const categories = [teamSports, rackets]

  it("nothing, one name, or a count", () => {
    expect(selectionLabel(none, categories)).toBeUndefined()
    expect(selectionLabel({ categories: ["tymove-sporty"], activities: [] }, categories)).toBe(
      "Týmové sporty",
    )
    expect(selectionLabel({ categories: [], activities: ["volejbal"] }, categories)).toBe(
      "Volejbal",
    )
    expect(
      selectionLabel({ categories: ["raketove-sporty"], activities: ["florbal"] }, categories),
    ).toBe("Typ aktivity (2)")
  })

  it("counts under the filter's own name", () => {
    expect(
      selectionLabel(
        { categories: ["raketove-sporty"], activities: ["florbal"] },
        categories,
        "Aktivita",
      ),
    ).toBe("Aktivita (2)")
  })

  it("does not count slugs the catalog doesn't know (they are dropped from the query)", () => {
    expect(selectionLabel({ categories: [], activities: ["kriket"] }, categories)).toBeUndefined()
    expect(selectionLabel({ categories: [], activities: ["kriket", "florbal"] }, categories)).toBe(
      "Florbal",
    )
  })
})

describe("searchActivities", () => {
  it("finds activities by name or synonym, ignoring case and diacritics", () => {
    const names = (q: string) =>
      searchActivities([teamSports, rackets], q).map(({ activity }) => activity.name)

    expect(names("VOLEJ")).toEqual(["Volejbal"])
    expect(names("pinces")).toEqual(["Stolní tenis"])
    expect(names("nohec")).toEqual(["Nohejbal"])
    expect(names("  ")).toEqual([])
  })
})
