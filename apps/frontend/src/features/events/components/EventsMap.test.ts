import { describe, expect, it } from "vitest"

import { toPin } from "@/features/events/components/EventsMap"
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
