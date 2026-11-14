import { describe, expect, it } from "vitest"

import { toPastPin, toPin } from "@/features/events/components/EventsMap"
import { anEvent } from "@/features/events/test/anEvent"

describe("toPin", () => {
  it("highlights events that miss people", () => {
    expect(toPin(anEvent({ title: "Večerní běh Letnou", missingToMin: 1 }))).toMatchObject({
      variant: "highlighted",
      label: "Večerní běh Letnou · chybí 1",
    })
  })

  it("dark pin with free places, muted pin when full", () => {
    expect(toPin(anEvent()).variant).toBe("default")
    expect(toPin(anEvent({ isFull: true, freeSpots: 0 }))).toMatchObject({
      variant: "full",
      label: "Language exchange: CZ/EN/ES · plno",
    })
  })
})

describe("toPastPin (#61)", () => {
  it("a hollow pin saying how it ended, never lime", () => {
    expect(
      toPastPin(anEvent({ title: "Volejbal na Letné", approvedCount: 5, missingToMin: 0 })),
    ).toMatchObject({ variant: "past", label: "Volejbal na Letné · proběhlo · sešlo se 5 lidí" })
    expect(
      toPastPin(anEvent({ title: "Volejbal ve Stromovce", approvedCount: 2, missingToMin: 2 })),
    ).toMatchObject({ variant: "past", label: "Volejbal ve Stromovce · nekonalo se" })
  })
})
