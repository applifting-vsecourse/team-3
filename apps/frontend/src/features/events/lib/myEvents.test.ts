import { describe, expect, it } from "vitest"

import { aMyEvent } from "@/features/events/test/anEvent"

import { attendingSections, attendingStatus } from "./myEvents"

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
