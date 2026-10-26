import { describe, expect, it } from "vitest"

import type { ActivityCategory } from "@/lib/catalog/catalogSchemas"

import {
  categoryState,
  isActivityChecked,
  isOtherActivity,
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

describe("searchActivities on the catalog's synonyms", () => {
  // a slice of the seed's catalog (demo-data.ts)
  const movement: ActivityCategory = {
    id: "c-pohyb",
    slug: "pohyb-a-tanec",
    name: "Pohyb a tanec",
    icon: "route",
    activities: [
      activity("joga", "Jóga", ["yoga", "protahování"]),
      activity("pilates", "Pilates", ["reformer", "core", "zdravá záda"]),
      activity("bojova-umeni", "Bojová umění", ["judo", "karate", "jiu-jitsu", "BJJ"]),
      activity("box-a-kickbox", "Box a kickbox", ["box", "kickbox", "MMA"]),
      activity("jiny-pohyb", "Jiná pohybová aktivita", ["parkour"]),
    ],
  }
  const outdoor: ActivityCategory = {
    id: "c-outdoor",
    slug: "outdoor",
    name: "Outdoor",
    icon: "mountain",
    activities: [
      activity("cyklistika", "Cyklistika", ["kolo", "MTB", "horské kolo"]),
      activity("via-ferrata", "Via ferrata", ["ferrata", "ferraty", "klettersteig"]),
    ],
  }
  const team: ActivityCategory = {
    ...teamSports,
    activities: [
      activity("ledni-hokej", "Lední hokej", ["hokej", "zimák"]),
      activity("jiny-tymovy-sport", "Jiný týmový sport", ["hokejbal", "házená"]),
    ],
  }
  const catalog = [team, movement, outdoor]
  const found = (query: string) =>
    searchActivities(catalog, query).map(({ activity, matchedKeyword }) =>
      matchedKeyword ? `${activity.name} · ${matchedKeyword}` : activity.name,
    )

  it("pilates is its own activity now, not Jóga", () => {
    expect(found("pilates")).toEqual(["Pilates"])
  })

  it("a synonym match says which synonym, as the catalog writes it", () => {
    expect(found("judo")).toEqual(["Bojová umění · judo"])
    expect(found("mtb")).toEqual(["Cyklistika · MTB"])
    expect(searchActivities(catalog, "judo")[0]).toMatchObject({
      category: { slug: "pohyb-a-tanec" },
      activity: { slug: "bojova-umeni" },
      matchedKeyword: "judo",
    })
  })

  it("finds a name of more words, typed without diacritics", () => {
    expect(found("via ferrata")).toEqual(["Via ferrata"])
    expect(found("boj")).toEqual(["Bojová umění"])
  })

  it("matches in a name come before matches in a synonym", () => {
    // „hokejbal“ starts with the query, but „Lední hokej“ has it in its name
    expect(found("hokej")).toEqual(["Lední hokej", "Jiný týmový sport · hokejbal"])
    // the start of a name before a word inside one, the catalog's order otherwise
    expect(found("box")).toEqual(["Box a kickbox"])
    expect(found("kolo")).toEqual(["Cyklistika · kolo"])
  })

  it("nothing for what the catalog doesn't know", () => {
    expect(found("xyz")).toEqual([])
  })
})

describe("isOtherActivity", () => {
  it("is each category's „Jiný…“, „Jiná…“, „Jiné…“", () => {
    expect(isOtherActivity("Jiný týmový sport")).toBe(true)
    expect(isOtherActivity("Jiná hra")).toBe(true)
    expect(isOtherActivity("Jiné tvoření")).toBe(true)
    expect(isOtherActivity("Jóga")).toBe(false)
  })
})
