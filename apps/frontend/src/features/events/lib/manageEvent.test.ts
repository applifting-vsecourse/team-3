import { describe, expect, it } from "vitest"

import { eventEmptySteps, eventNextStep, peopleLabel, showsRequests } from "./manageEvent"

describe("showsRequests", () => {
  it("shows them at an event with approval", () => {
    expect(showsRequests({ approvalMode: "approval", status: "published" })).toBe(true)
  })

  it("has none to show at an open event", () => {
    expect(showsRequests({ approvalMode: "open", status: "published" })).toBe(false)
  })

  it("hides them once the event is cancelled (#183)", () => {
    expect(showsRequests({ approvalMode: "approval", status: "cancelled" })).toBe(false)
  })
})

describe("eventNextStep (#371)", () => {
  const now = new Date("2026-11-19T10:00:00Z")
  const upcoming = {
    status: "published" as const,
    startsAt: new Date("2026-11-28T17:00:00Z"),
    missingToMin: 0,
    isFull: false,
  }

  it("shares the link while people are missing, even when someone is coming", () => {
    expect(eventNextStep({ ...upcoming, missingToMin: 3 }, 0, true, now)).toEqual({
      action: "share",
      text: "Do minima chybí 3. Pošli odkaz partě.",
    })
    expect(eventNextStep({ ...upcoming, missingToMin: 1 }, 2, true, now)?.action).toBe("share")
  })

  it("writes to the participants once it happens", () => {
    expect(eventNextStep(upcoming, 4, true, now)).toEqual({
      action: "write",
      text: "Akce se koná. Napiš účastníkům, co si vzít a kde se sejdete.",
    })
  })

  it("shares on when the viewer can't write (a group's admin) and there is room", () => {
    expect(eventNextStep(upcoming, 4, false, now)?.action).toBe("share")
  })

  it("has nothing for a full event the viewer can't write to", () => {
    expect(eventNextStep({ ...upcoming, isFull: true }, 4, false, now)).toBeNull()
  })

  it("waits for the participants before choosing between writing and sharing", () => {
    expect(eventNextStep(upcoming, undefined, true, now)).toBeNull()
  })

  it("has none for a cancelled or started event (#183)", () => {
    expect(
      eventNextStep({ ...upcoming, status: "cancelled", missingToMin: 2 }, 0, true, now),
    ).toBeNull()
    expect(
      eventNextStep(
        { ...upcoming, startsAt: new Date("2026-11-19T09:00:00Z"), missingToMin: 2 },
        0,
        true,
        now,
      ),
    ).toBeNull()
  })
})

describe("peopleLabel", () => {
  it.each([
    [1, "1 člověk"],
    [2, "2 lidé"],
    [4, "4 lidé"],
    [5, "5 lidí"],
    [12, "12 lidí"],
  ])("%i → %s", (count, label) => {
    expect(peopleLabel(count)).toBe(label)
  })
})

describe("eventEmptySteps (#371)", () => {
  it("follows the event's own rules", () => {
    expect(eventEmptySteps({ approvalMode: "open", missingToMin: 3, approvedCount: 0 })).toEqual([
      "Sdílej odkaz – v chatu party, ve skupině nebo na sítích.",
      "Kdo se přihlásí, objeví se tady. Akce bez schválení ho počítá hned.",
      "Jakmile se přihlásí 3 lidé, akce se koná – u akce se ukáže „Koná se“.",
      "Po akci si navzájem dáte hodnocení.",
    ])
  })

  it("counts who is still missing when the organizer has a place (Q12, review #382)", () => {
    expect(eventEmptySteps({ approvalMode: "open", missingToMin: 2, approvedCount: 1 })[2]).toBe(
      "Jakmile se přihlásí ještě 2 lidé, akce se koná – u akce se ukáže „Koná se“.",
    )
    expect(eventEmptySteps({ approvalMode: "open", missingToMin: 0, approvedCount: 1 })[2]).toBe(
      "Minimum je splněné, akce se koná – u akce je „Koná se“.",
    )
  })

  it("speaks of requests at an event with approval", () => {
    expect(
      eventEmptySteps({ approvalMode: "approval", missingToMin: 5, approvedCount: 0 })[1],
    ).toBe("Kdo se přihlásí, objeví se v Žádostech. Schválíš ho, nebo zamítneš.")
  })
})
