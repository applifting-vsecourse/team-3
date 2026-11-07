import { describe, expect, it } from "vitest"

import { aMyEvent } from "@/features/events/test/anEvent"

import {
  attendingNumbers,
  attendingRowLead,
  attendingSections,
  attendingStatus,
  organizingNumbers,
  organizingRowTail,
  organizingStatus,
  pendingRequestsSummary,
  requestCountLabel,
} from "./myEvents"

describe("attendingSections", () => {
  it("puts waiting requests apart from approved places, keeping the order", () => {
    const first = aMyEvent({ id: "e1" })
    const waiting = aMyEvent({ id: "e2", myParticipation: "pending" })
    const second = aMyEvent({ id: "e3" })

    expect(attendingSections([first, waiting, second])).toEqual({
      pending: [waiting],
      approved: [first, second],
      cancelled: [],
    })
  })

  it("puts a cancelled event at the end, apart from places and requests (#183)", () => {
    const place = aMyEvent({ id: "e1" })
    const cancelledPlace = aMyEvent({ id: "e2", status: "cancelled" })
    const cancelledRequest = aMyEvent({
      id: "e3",
      status: "cancelled",
      myParticipation: "pending",
    })

    expect(attendingSections([place, cancelledPlace, cancelledRequest])).toEqual({
      pending: [],
      approved: [place],
      cancelled: [cancelledPlace, cancelledRequest],
    })
  })
})

describe("attendingNumbers", () => {
  it("the badge is „Jdu“, so below the minimum the line says how many are missing itself", () => {
    expect(
      attendingNumbers(
        aMyEvent({ approvedCount: 8, minParticipants: 9, maxParticipants: 14, missingToMin: 1 }),
      ),
    ).toBe("chybí 1 · 8 z 14 · min. 9")
  })

  it("the same for a request still waiting („Čeká na schválení“)", () => {
    expect(
      attendingNumbers(aMyEvent({ myParticipation: "pending", approvedCount: 2, missingToMin: 2 })),
    ).toBe("chybí 2 · 2 z 12 · min. 4")
  })

  it("from the minimum as in the list, with the minimum", () => {
    expect(attendingNumbers(aMyEvent())).toBe("4 z 12 · min. 4")
    expect(attendingNumbers(aMyEvent({ approvedCount: 12, freeSpots: 0, isFull: true }))).toBe(
      "12 z 12 · min. 4",
    )
  })

  it("a cancelled event misses no one any more", () => {
    expect(
      attendingNumbers(aMyEvent({ status: "cancelled", approvedCount: 2, missingToMin: 2 })),
    ).toBe("2 z 12")
  })
})

describe("attendingStatus", () => {
  it("is „Jdu“ for a place and „Čeká na schválení“ for a request", () => {
    expect(attendingStatus(aMyEvent())).toEqual({ kind: "going" })
    expect(attendingStatus(aMyEvent({ myParticipation: "pending" }))).toEqual({ kind: "pending" })
  })

  it("says „Zrušeno“ for a cancelled event, whatever my place", () => {
    expect(attendingStatus(aMyEvent({ status: "cancelled" }))).toEqual({ kind: "cancelled" })
    expect(attendingStatus(aMyEvent({ status: "cancelled", myParticipation: "pending" }))).toEqual({
      kind: "cancelled",
    })
  })
})

describe("requestCountLabel", () => {
  it.each([
    [1, "1 žádost"],
    [2, "2 žádosti"],
    [4, "4 žádosti"],
    [5, "5 žádostí"],
  ])("%i → %s", (count, label) => {
    expect(requestCountLabel(count)).toBe(label)
  })
})

describe("organizingStatus", () => {
  it("is the occupancy, or „Zrušeno“ for a cancelled event", () => {
    expect(organizingStatus(aMyEvent({ missingToMin: 1 }))).toEqual({ kind: "missing", missing: 1 })
    expect(organizingStatus(aMyEvent({ status: "cancelled", missingToMin: 1 }))).toEqual({
      kind: "cancelled",
    })
  })
})

describe("organizingNumbers", () => {
  const organized = (overrides: Parameters<typeof aMyEvent>[0]) =>
    aMyEvent({ myParticipation: null, pendingRequests: 0, ...overrides })

  it("shows the requests to decide first", () => {
    expect(
      organizingNumbers(
        organized({ approvedCount: 4, maxParticipants: 5, missingToMin: 0, pendingRequests: 2 }),
      ),
    ).toBe("4 z 5 · min. 4 · 2 žádosti")
  })

  it("with requests below the minimum, the occupancy and then the requests", () => {
    expect(
      organizingNumbers(
        organized({
          approvedCount: 3,
          maxParticipants: 12,
          minParticipants: 4,
          missingToMin: 1,
          pendingRequests: 2,
        }),
      ),
    ).toBe("3 z 12 · min. 4 · 2 žádosti")
  })

  it("else the minimum, while people are missing; „chybí“ is the badge's (#189)", () => {
    expect(
      organizingNumbers(
        organized({ approvedCount: 3, maxParticipants: 12, minParticipants: 4, missingToMin: 1 }),
      ),
    ).toBe("3 z 12 · min. 4")
  })

  // Figma C-02d: „8 z 8 · min. 6“, no district
  it("else just the occupancy with the minimum", () => {
    expect(
      organizingNumbers(organized({ approvedCount: 8, maxParticipants: 8, isFull: true })),
    ).toBe("8 z 8 · min. 4")
  })

  it("on a cancelled event neither requests nor the minimum matter any more", () => {
    expect(
      organizingNumbers(
        organized({ status: "cancelled", approvedCount: 2, missingToMin: 2, pendingRequests: 1 }),
      ),
    ).toBe("2 z 12")
  })
})

// Figma C-01, C-02: the row card's line on a phone
describe("row card lines", () => {
  it("Přihlášen starts with how many are missing, as the badge is the user's place", () => {
    expect(attendingRowLead(aMyEvent({ approvedCount: 3, missingToMin: 1 }))).toBe("chybí 1")
    expect(attendingRowLead(aMyEvent())).toBeUndefined()
    expect(attendingRowLead(aMyEvent({ status: "cancelled", missingToMin: 2 }))).toBeUndefined()
  })

  it("Pořádám ends with the requests waiting, in Czech forms", () => {
    const organized = (pendingRequests: number) =>
      aMyEvent({ myParticipation: null, pendingRequests })
    expect(organizingRowTail(organized(1))).toBe("1 žádost čeká")
    expect(organizingRowTail(organized(2))).toBe("2 žádosti čekají")
    expect(organizingRowTail(organized(5))).toBe("5 žádostí čeká")
    expect(organizingRowTail(organized(0))).toBeUndefined()
  })
})

describe("pendingRequestsSummary", () => {
  it("adds up the requests and names the events they wait on", () => {
    expect(
      pendingRequestsSummary([
        aMyEvent({ title: "Deskovky", pendingRequests: 2 }),
        aMyEvent({ title: "Běh", pendingRequests: 0 }),
        aMyEvent({ title: "Kooperativní deskovky", pendingRequests: 2 }),
      ]),
    ).toEqual({
      title: "4 žádosti čekají na schválení",
      events: "Deskovky (2), Kooperativní deskovky (2)",
    })
  })

  it.each([
    [1, "1 žádost čeká na schválení"],
    [5, "5 žádostí čeká na schválení"],
  ])("%i request(s) → %s", (count, title) => {
    expect(pendingRequestsSummary([aMyEvent({ pendingRequests: count })])?.title).toBe(title)
  })

  it("is null without requests, cancelled events left out", () => {
    expect(pendingRequestsSummary([aMyEvent({ pendingRequests: 0 })])).toBeNull()
    expect(
      pendingRequestsSummary([aMyEvent({ status: "cancelled", pendingRequests: 3 })]),
    ).toBeNull()
  })
})
