import { describe, expect, it } from "vitest"

import type { Locality } from "@/lib/catalog/catalogSchemas"

import {
  INTEREST_GOAL,
  moveOnboarding,
  reviewOnboarding,
  startOnboarding,
  type OnboardingCommand,
  type OnboardingFlow,
} from "./onboardingFlow"

const prague: Locality = {
  id: "praha",
  name: "Praha",
  slug: "praha",
  parentId: null,
  lat: 50.087,
  lng: 14.422,
}
const district: Locality = {
  ...prague,
  id: "praha-8",
  name: "Praha 8",
  slug: "praha-8",
  parentId: "praha",
}

const take = (interestId: string): OnboardingCommand => ({ type: "toggle", interestId })
const place = (locality: Locality): OnboardingCommand => ({ type: "pick-place", locality })

function follow(...commands: OnboardingCommand[]) {
  return commands.reduce(moveOnboarding, startOnboarding())
}
/** Three picks; the third opens the decision by itself. */
function withThree() {
  return follow(place(prague), take("hike"), take("hockey"), take("chess"))
}

describe("onboarding transitions", () => {
  it("uses the clicked locality and moves directly from locality to interests", () => {
    const result = follow(place(district))
    expect(result.stage).toBe("interests")
    expect(result.locality).toBe(district)
    expect(result.overlay).toBeNull()
    expect(result.interestIds).toEqual([])
  })

  it("opening a category preserves locality and does not count as an interest", () => {
    const result = follow(place(prague), { type: "browse", categoryId: "outdoor" }, take("hike"), {
      type: "browse",
      categoryId: "games",
    })
    expect(result.categoryId).toBe("games")
    expect(result.locality).toBe(prague)
    expect(result.interestIds).toEqual(["hike"])
  })

  it("preserves the current selection when going back and selecting a district", () => {
    const result = follow(
      place(prague),
      { type: "browse", categoryId: "outdoor" },
      take("hike"),
      { type: "back" },
      place(district),
    )
    expect(result.locality?.id).toBe("praha-8")
    expect(result.interestIds).toEqual(["hike"])
    expect(result.categoryId).toBe("outdoor")
  })

  it("does not accept delayed place updates after moving to the next stage", () => {
    const result = follow(place(district), place(prague))
    expect(result.locality).toBe(district)
  })

  it("opens the decision by itself at the third pick and on request with one or two", () => {
    const empty = follow(place(prague))
    const first = moveOnboarding(empty, take("hike"))
    const second = moveOnboarding(first, take("hockey"))
    const third = moveOnboarding(second, take("chess"))
    expect(moveOnboarding(empty, { type: "review" })).toBe(empty)
    expect([first, second, third].map(reviewOnboarding)).toEqual([true, true, true])
    expect([first, second, third].map((state) => state.overlay)).toEqual([null, null, "decision"])
    expect(third.interestIds).toHaveLength(INTEREST_GOAL)
    expect(moveOnboarding(first, { type: "review" }).overlay).toBe("decision")
  })

  it("never counts two taps on the same card as two selections", () => {
    const result = follow(place(prague), take("hike"), take("hike"), take("hockey"), take("chess"))
    expect(result.interestIds).toEqual(["hockey", "chess"])
    expect(result.overlay).toBeNull()
  })

  it("rejects toggles and category changes while the decision owns focus", () => {
    const state = withThree()
    expect(moveOnboarding(state, take("tennis"))).toBe(state)
    expect(moveOnboarding(state, take("hike"))).toBe(state)
    expect(moveOnboarding(state, { type: "browse", categoryId: "running" })).toBe(state)
    expect(moveOnboarding(state, { type: "exit" })).toBe(state)
  })

  it("dismisses the decision while keeping three selections and lets the user reopen it", () => {
    const original = withThree()
    const dismissed = moveOnboarding(original, { type: "dismiss" })
    expect(dismissed.stage).toBe("interests")
    expect(dismissed.overlay).toBeNull()
    expect(dismissed.interestIds).toBe(original.interestIds)
    expect(moveOnboarding(dismissed, { type: "review" }).overlay).toBe("decision")
  })

  it("lets the user confirm again after replacing an interest", () => {
    const dismissed = moveOnboarding(withThree(), { type: "dismiss" })
    const removed = moveOnboarding(dismissed, take("hockey"))
    const result = moveOnboarding(removed, take("tennis"))
    expect(removed.interestIds).toEqual(["hike", "chess"])
    expect(removed.overlay).toBeNull()
    expect(result.interestIds).toEqual(["hike", "chess", "tennis"])
    expect(result.overlay).toBe("decision")
  })

  it("caps the selection while the closed decision can be reopened", () => {
    const dismissed = moveOnboarding(withThree(), { type: "dismiss" })
    expect(moveOnboarding(dismissed, take("tennis"))).toBe(dismissed)
  })

  it.each<OnboardingFlow>([
    startOnboarding(),
    follow(place(prague), take("hike")),
    moveOnboarding(withThree(), { type: "dismiss" }),
  ])("backs out of exit confirmation without mutating the draft in $stage", (state) => {
    const exiting = moveOnboarding(state, { type: "exit" })
    expect(exiting.overlay).toBe("exit")
    expect(moveOnboarding(exiting, { type: "back" })).toEqual(state)
  })
})
