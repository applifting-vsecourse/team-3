import { describe, expect, it } from "vitest"

import { aMyEvent } from "@/features/events/test/anEvent"

import {
  attendingSections,
  attendingStatus,
  organizingFacts,
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
    })
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

describe("organizingFacts", () => {
  const organized = (overrides: Parameters<typeof aMyEvent>[0]) =>
    aMyEvent({ myParticipation: null, pendingRequests: 0, ...overrides })

  it("shows the requests to decide first", () => {
    expect(
      organizingFacts(
        organized({ approvedCount: 4, maxParticipants: 5, missingToMin: 0, pendingRequests: 2 }),
      ),
    ).toBe("4/5 · 2 žádosti")
  })

  it("else the minimum, while people are missing", () => {
    expect(
      organizingFacts(
        organized({ approvedCount: 3, maxParticipants: 12, minParticipants: 4, missingToMin: 1 }),
      ),
    ).toBe("3/12 · min. 4")
  })

  it("else the district, as in the list", () => {
    expect(organizingFacts(organized({ approvedCount: 8, maxParticipants: 8, isFull: true }))).toBe(
      "8/8 · Praha 8",
    )
  })

  it("on a cancelled event neither requests nor the minimum matter any more", () => {
    expect(
      organizingFacts(
        organized({ status: "cancelled", approvedCount: 2, missingToMin: 2, pendingRequests: 1 }),
      ),
    ).toBe("2/12 · Praha 8")
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
