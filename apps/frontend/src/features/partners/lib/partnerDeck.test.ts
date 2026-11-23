import { describe, expect, it } from "vitest"

import type { Partner } from "@/features/partners/api/partnersSchemas"

import {
  announce,
  deckQueue,
  distanceLabel,
  emptyDeck,
  moveDeck,
  requestsLeftLabel,
  sharedInterestsLabel,
} from "./partnerDeck"

const partner = (id: string, changes: Partial<Partner> = {}): Partner => ({
  id,
  name: `Člověk ${id}`,
  distanceBandKm: 5,
  sharedInterests: [{ id: "v", name: "Volejbal", slug: "volejbal" }],
  otherInterests: [],
  hasRequestedMe: false,
  ...changes,
})
const [a, b, c] = [partner("a"), partner("b"), partner("c")]

describe("the deck's moves (#84)", () => {
  it("a skipped or added card leaves the queue; the pages' order stays", () => {
    const skipped = moveDeck(emptyDeck(), { type: "skip", partner: a })
    expect(deckQueue([a, b, c], skipped).map(({ id }) => id)).toEqual(["b", "c"])
    const added = moveDeck(skipped, { type: "request", partner: b })
    expect(deckQueue([a, b, c], added).map(({ id }) => id)).toEqual(["c"])
  })

  it("Vrátit brings back only the last Teď ne, on top", () => {
    let state = moveDeck(emptyDeck(), { type: "skip", partner: a })
    state = moveDeck(state, { type: "skip", partner: b })
    state = moveDeck(state, { type: "undo" })
    expect(deckQueue([a, b, c], state).map(({ id }) => id)).toEqual(["b", "c"])
    expect(state.undoable).toBeNull()
    expect(moveDeck(state, { type: "undo" })).toBe(state)
  })

  it("Přidat isn't undone and ends what Vrátit could bring back", () => {
    let state = moveDeck(emptyDeck(), { type: "skip", partner: a })
    state = moveDeck(state, { type: "request", partner: b })
    expect(state.undoable).toBeNull()
  })

  it("a card brought back stays on top even when a refetch dropped it from the pages", () => {
    let state = moveDeck(emptyDeck(), { type: "skip", partner: a })
    state = moveDeck(state, { type: "undo" })
    // the server already left a out of a refetched page
    expect(deckQueue([b, c], state).map(({ id }) => id)).toEqual(["a", "b", "c"])
  })

  it("a failed action brings the card back on top", () => {
    let state = moveDeck(emptyDeck(), { type: "request", partner: b })
    state = moveDeck(state, { type: "failed", partner: b })
    expect(deckQueue([a, b, c], state).map(({ id }) => id)).toEqual(["b", "a", "c"])
  })

  it("never shows a person twice when pages overlap", () => {
    expect(deckQueue([a, b, b, c], emptyDeck()).map(({ id }) => id)).toEqual(["a", "b", "c"])
  })
})

describe("what a card and the deck say (#84)", () => {
  it.each([
    [2, "do 2 km"],
    [5, "asi 5 km"],
    [10, "asi 10 km"],
    [25, "asi 25 km"],
    [50, "do 50 km"],
  ])("the %s km band reads „%s“", (band, label) => {
    expect(distanceLabel(band)).toBe(label)
  })

  it.each([
    [1, "1 společný zájem"],
    [3, "3 společné zájmy"],
    [5, "5 společných zájmů"],
  ])("%s → „%s“", (count, label) => {
    expect(sharedInterestsLabel(count)).toBe(label)
  })

  it("counts down today's additions only from five, never at zero", () => {
    expect(requestsLeftLabel(6)).toBeUndefined()
    expect(requestsLeftLabel(5)).toBe("Dnes ještě 5 přidání.")
    expect(requestsLeftLabel(1)).toBe("Dnes ještě 1 přidání.")
    expect(requestsLeftLabel(0)).toBeUndefined()
  })

  it("announces what happened and who is next, without a gender", () => {
    expect(announce("skip", a, b)).toBe("Přeskočeno. Další: Člověk b, asi 5 km, 1 společný zájem.")
    expect(announce("request", a, undefined)).toBe(
      "Žádost odeslána: Člověk a. Další lidi v okolí teď nejsou.",
    )
    expect(announce("undo", a, b)).toBe("Vráceno: Člověk a.")
    expect(announce("match", a, b)).toBe("Je to shoda: Člověk a.")
  })
})
