import { describe, expect, it } from "vitest"

import { aMyEvent } from "@/features/events/test/anEvent"

import {
  attendingLine,
  attendingNumbers,
  attendingRowLead,
  attendingSections,
  attendingStatus,
  initialMyEventsTab,
  myEventsSearchSchema,
  organizingLine,
  organizingNumbers,
  organizingRowTail,
  organizingSections,
  organizingStatus,
  pendingRequestsSummary,
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

describe("organizingSections", () => {
  it("upcoming apart from cancelled, keeping the order (C-02, 4. 11.)", () => {
    const a = aMyEvent({ id: "a" })
    const b = aMyEvent({ id: "b", status: "cancelled" })
    const c = aMyEvent({ id: "c" })

    expect(organizingSections([a, b, c])).toEqual({ upcoming: [a, c], cancelled: [b] })
  })
})

describe("band lines (Figma C-01d, C-02d)", () => {
  // the fixture starts Fri 23. 10. 2026 17:30 Prague time
  const monday = new Date("2026-10-19T08:00:00.000Z")

  it("Přihlášen names the nearest event that still happens", () => {
    const later = aMyEvent({ id: "later", startsAt: new Date("2026-10-30T16:30:00.000Z") })
    const cancelled = aMyEvent({
      id: "x",
      status: "cancelled",
      startsAt: new Date("2026-10-20T16:30:00.000Z"),
    })

    expect(attendingLine([later, aMyEvent(), cancelled], monday)).toBe(
      "Akce, kam jdeš, a ty, kde čekáš na schválení. Nejbližší: jazykový tandem v pátek v 17:30.",
    )
  })

  it("keeps an acronym in the activity's name („RPG“, review #269)", () => {
    const rpg = aMyEvent({
      activity: { ...aMyEvent().activity, name: "RPG (D&D apod.)" },
    })

    expect(attendingLine([rpg], monday)).toMatch(/Nejbližší: RPG \(D&D apod\.\) v pátek/)
  })

  it("Přihlášen without an event to go to says only what the tab holds", () => {
    expect(attendingLine([], monday)).toBe("Akce, kam jdeš, a ty, kde čekáš na schválení.")
    expect(attendingLine(undefined, monday)).toBe("Akce, kam jdeš, a ty, kde čekáš na schválení.")
  })

  it.each([
    [0, "Akce, které pořádáš, od nejbližší."],
    [1, "Akce, které pořádáš, od nejbližší. Na schválení čeká 1 žádost."],
    [4, "Akce, které pořádáš, od nejbližší. Na schválení čekají 4 žádosti."],
    [5, "Akce, které pořádáš, od nejbližší. Na schválení čeká 5 žádostí."],
  ])("Pořádám with %i requests: „%s“", (pendingRequests, line) => {
    expect(organizingLine([aMyEvent({ pendingRequests })])).toBe(line)
  })
})

describe("myEventsSearchSchema", () => {
  it.each([
    ["prihlasen", "prihlasen"],
    ["poradam", "poradam"],
    ["neco", undefined],
    [undefined, undefined],
  ])("?tab=%s is %s", (tab, expected) => {
    expect(myEventsSearchSchema.parse({ tab }).tab).toBe(expected)
  })
})

describe("initialMyEventsTab (#188)", () => {
  const loaded = (events: ReturnType<typeof aMyEvent>[]) => ({ events, isPending: false })
  const loading = { events: undefined, isPending: true }
  const failed = { events: undefined, isPending: false }
  const going = aMyEvent({ id: "a1" })
  const running = aMyEvent({ id: "o1", pendingRequests: 0 })
  const withRequests = aMyEvent({ id: "o2", pendingRequests: 2 })

  it("Pořádám while requests wait there, even with events to go to", () => {
    expect(initialMyEventsTab(loaded([going]), loaded([running, withRequests]))).toBe("poradam")
  })

  it("knows that before Přihlášen has loaded, or when it failed", () => {
    expect(initialMyEventsTab(loading, loaded([withRequests]))).toBe("poradam")
    expect(initialMyEventsTab(failed, loaded([withRequests]))).toBe("poradam")
  })

  it("Pořádám with nothing to go to and something to run", () => {
    expect(initialMyEventsTab(loaded([]), loaded([running]))).toBe("poradam")
  })

  it("Přihlášen with something to go to and no requests", () => {
    expect(initialMyEventsTab(loaded([going]), loaded([running]))).toBe("prihlasen")
    // a request of mine waiting counts as something to go to, as on the tab
    expect(
      initialMyEventsTab(loaded([aMyEvent({ myParticipation: "pending" })]), loaded([running])),
    ).toBe("prihlasen")
  })

  it("Přihlášen when there is nothing anywhere", () => {
    expect(initialMyEventsTab(loaded([]), loaded([]))).toBe("prihlasen")
  })

  it("counts what the tabs count: cancelled events are neither something to go to nor to run", () => {
    const cancelled = { status: "cancelled" as const }
    // only a cancelled event to go to: nothing to go to
    expect(initialMyEventsTab(loaded([aMyEvent(cancelled)]), loaded([running]))).toBe("poradam")
    // only a cancelled event to run, its requests no longer matter: nothing to run
    expect(
      initialMyEventsTab(loaded([]), loaded([aMyEvent({ ...cancelled, pendingRequests: 3 })])),
    ).toBe("prihlasen")
  })

  it("waits while either tab loads, unless requests already tell", () => {
    expect(initialMyEventsTab(loading, loaded([running]))).toBeUndefined()
    expect(initialMyEventsTab(loaded([]), loading)).toBeUndefined()
    expect(initialMyEventsTab(loading, loading)).toBeUndefined()
  })

  it("a tab that failed never sends anyone to Pořádám", () => {
    expect(initialMyEventsTab(failed, loaded([running]))).toBe("prihlasen")
    expect(initialMyEventsTab(loaded([]), failed)).toBe("prihlasen")
  })
})

describe("an event going on right now (#272, review #323)", () => {
  // 17:30 in Prague, no end: going on at 18:00, over at midnight
  const running = aMyEvent({ missingToMin: 1, approvedCount: 3 })
  const at1800 = new Date("2026-10-23T16:00:00.000Z")
  const before = new Date("2026-10-23T08:00:00.000Z")

  it("says „Probíhá“ instead of „Jdu“ or the occupancy: nobody joins or leaves any more", () => {
    expect(attendingStatus(running, at1800)).toEqual({ kind: "in-progress" })
    expect(attendingStatus(aMyEvent({ myParticipation: "pending" }), at1800)).toEqual({
      kind: "in-progress",
    })
    expect(organizingStatus(running, at1800)).toEqual({ kind: "in-progress" })
    expect(attendingStatus(running, before)).toEqual({ kind: "going" })
  })

  it("no „chybí 1“: once it runs, nobody can join to fill it", () => {
    expect(attendingRowLead(running, at1800)).toBeUndefined()
    expect(attendingRowLead(running, before)).toBe("chybí 1")
    expect(attendingNumbers(running, at1800)).not.toMatch(/chybí/)
  })

  it("no requests to decide: the API refuses approving and declining once it runs", () => {
    const waiting = aMyEvent({ pendingRequests: 2, missingToMin: 1, approvedCount: 3 })

    expect(pendingRequestsSummary([waiting], at1800)).toBeNull()
    expect(organizingLine([waiting], at1800)).toBe("Akce, které pořádáš, od nejbližší.")
    expect(organizingRowTail(waiting, at1800)).toBeUndefined()
    expect(organizingNumbers(waiting, at1800)).not.toMatch(/žádost/)
    // before it starts they still wait
    expect(pendingRequestsSummary([waiting], before)?.title).toBe("2 žádosti čekají na schválení")
    expect(organizingRowTail(waiting, before)).toBe("2 žádosti čekají")
  })

  it("a cancelled event stays „Zrušeno“", () => {
    expect(attendingStatus(aMyEvent({ status: "cancelled" }), at1800)).toEqual({
      kind: "cancelled",
    })
  })
})
