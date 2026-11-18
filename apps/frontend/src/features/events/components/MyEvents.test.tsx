import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import {
  AttendingEvents,
  OrganizingEvents,
  PastEvents,
} from "@/features/events/components/MyEvents"
import { aMyEvent } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

// what the API sends: dates as ISO strings
const asJson = (body: unknown) =>
  ({ json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) }) as never

const renderWithQuery = (ui: ReactElement) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}>
      {ui}
    </QueryClientProvider>,
  )

type Answer = ReturnType<typeof asJson>
type GetOptions = { searchParams?: { tab?: string } }

/** Přihlášen asks for its tab and for Z mých skupin (#304), which stays empty unless given. */
const attendingAnswers = (attending: Answer, groups: Answer = asJson([])) =>
  get.mockImplementation(((_url: string, options?: GetOptions) =>
    options?.searchParams?.tab === "groups" ? groups : attending) as never)

describe("AttendingEvents", () => {
  beforeEach(() => get.mockReset())

  it("asks for the attending tab and shows waiting requests apart from places", async () => {
    attendingAnswers(
      asJson([
        aMyEvent({ id: "e1", title: "Florbal" }),
        aMyEvent({ id: "e2", title: "Výlet na Zbraslav", myParticipation: "pending" }),
        aMyEvent({ id: "e3", title: "Volejbal", status: "cancelled" }),
      ]),
    )

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    const waiting = await screen.findByRole("region", { name: "Čeká na schválení (1)" })
    expect(within(waiting).getByRole("link", { name: "Výlet na Zbraslav" })).toHaveAttribute(
      "href",
      "/akce/e2",
    )
    // Figma C-01: the badge says it whole; on a phone the occupancy goes under it
    expect(within(waiting).getByText("Čeká na schválení", { selector: "span" })).toBeInTheDocument()

    const confirmed = screen.getByRole("region", { name: "Potvrzené (1)" })
    const [florbal] = within(confirmed).getAllByRole("listitem")
    expect(within(florbal!).getByText("Jdu")).toBeInTheDocument()

    // a cancelled event is not a confirmed place (#183): its own section, last
    const cancelled = screen.getByRole("region", { name: "Zrušené (1)" })
    const [volejbal] = within(cancelled).getAllByRole("listitem")
    expect(within(volejbal!).getByRole("link", { name: "Volejbal" })).toBeInTheDocument()
    expect(within(volejbal!).getByText("Zrušeno")).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Čeká na schválení (1)",
      "Potvrzené (1)",
      "Zrušené (1)",
    ])

    expect(get).toHaveBeenCalledWith("me/events", { searchParams: { tab: "attending" } })
  })

  it("says how many are missing in the line, as the badge is „Jdu“ (#189)", async () => {
    attendingAnswers(
      asJson([aMyEvent({ id: "e1", title: "Florbal", approvedCount: 3, missingToMin: 1 })]),
    )

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    const [florbal] = within(
      await screen.findByRole("region", { name: "Potvrzené (1)" }),
    ).getAllByRole("listitem")
    expect(within(florbal!).getByText("Jdu")).toBeInTheDocument()
    // the grid card's numbers (desktop) and the row card's line (phone), Figma C-01d / C-01
    expect(within(florbal!).getByText("chybí 1 · 3 z 12 · min. 4")).toBeInTheDocument()
    expect(
      within(florbal!).getByText("chybí 1 · 17:30 · Kavárna Pražírna · Praha 8"),
    ).toBeInTheDocument()
  })

  it("leaves out a section with nothing in it", async () => {
    attendingAnswers(asJson([aMyEvent()]))

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    expect(await screen.findByRole("heading", { name: "Potvrzené (1)" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /Čeká na schválení/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /Zrušené/ })).not.toBeInTheDocument()
  })

  it("says in one sentence that I go nowhere yet, with the way to the events", async () => {
    attendingAnswers(asJson([]))

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    expect(
      await screen.findByText("Zatím nejdeš na žádnou akci. Mrkni, komu v okolí chybí lidé."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Projít akce" })).toHaveAttribute(
      "href",
      "/akce?obsazenost=chybi",
    )
  })

  it("with only cancelled events still says I go nowhere, above them (#183)", async () => {
    attendingAnswers(asJson([aMyEvent({ title: "Volejbal", status: "cancelled" })]))

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    const empty = await screen.findByText(
      "Zatím nejdeš na žádnou akci. Mrkni, komu v okolí chybí lidé.",
    )
    expect(screen.getByRole("link", { name: "Projít akce" })).toHaveAttribute(
      "href",
      "/akce?obsazenost=chybi",
    )
    const cancelled = screen.getByRole("region", { name: "Zrušené (1)" })
    expect(within(cancelled).getByRole("link", { name: "Volejbal" })).toBeInTheDocument()
    // the empty state comes first, the cancelled section after it
    expect(empty.compareDocumentPosition(cancelled) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole("heading", { name: /Potvrzené/ })).not.toBeInTheDocument()
  })

  it("Z mých skupin: events of my groups I don't go to yet, with a note, the occupancy and the group (#304)", async () => {
    attendingAnswers(
      asJson([aMyEvent({ id: "e1", title: "Florbal" })]),
      asJson([
        aMyEvent({
          id: "g1",
          title: "Večerní běh Letnou",
          myParticipation: null,
          missingToMin: 2,
          group: { id: "grp", name: "Běžci ze Stromovky" },
        }),
      ]),
    )

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    const fromGroups = await screen.findByRole("region", { name: "Z mých skupin (1)" })
    expect(
      within(fromGroups).getByText(
        "Na tyhle akce zatím nejdeš. Jsou ze skupin, kde jsi členem – přihlásíš se na detailu akce.",
      ),
    ).toBeInTheDocument()
    expect(within(fromGroups).getByRole("link", { name: "Večerní běh Letnou" })).toHaveAttribute(
      "href",
      "/akce/g1",
    )
    // the occupancy, not „Jdu“: it isn't mine yet
    expect(within(fromGroups).getByText("Chybí 2")).toBeInTheDocument()
    expect(within(fromGroups).queryByText("Jdu")).not.toBeInTheDocument()
    expect(within(fromGroups).getByText("Běžci ze Stromovky")).toBeInTheDocument()
    // between Potvrzené and Zrušené
    const confirmed = screen.getByRole("region", { name: "Potvrzené (1)" })
    expect(
      confirmed.compareDocumentPosition(fromGroups) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(get).toHaveBeenCalledWith("me/events", { searchParams: { tab: "groups" } })
  })

  it("Z mých skupin that fails to load says so with „Zkusit znovu“; the rest of the tab stays (review #318)", async () => {
    attendingAnswers(asJson([aMyEvent({ id: "e1", title: "Florbal" })]), {
      json: () => Promise.reject(new Error("HTTP 500")),
    } as never)

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    expect(await screen.findByText("Akce z mých skupin se nepodařilo načíst")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Potvrzené (1)" })).toBeInTheDocument()
  })

  it("no section without events from my groups", async () => {
    attendingAnswers(asJson([aMyEvent({ id: "e1", title: "Florbal" })]))

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    expect(await screen.findByRole("region", { name: "Potvrzené (1)" })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: /Z mých skupin/ })).not.toBeInTheDocument()
  })

  it("on an error offers to try again", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) } as never)
    get.mockReturnValue(asJson([]))

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    expect(await screen.findByText("Akce se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(
      await screen.findByText("Zatím nejdeš na žádnou akci. Mrkni, komu v okolí chybí lidé."),
    ).toBeInTheDocument()
  })
})

describe("OrganizingEvents", () => {
  beforeEach(() => get.mockReset())

  const organized = (overrides: Parameters<typeof aMyEvent>[0]) =>
    aMyEvent({ myParticipation: null, pendingRequests: 0, ...overrides })

  it("puts the upcoming events apart from the cancelled ones (C-02, 4. 11.)", async () => {
    get.mockReturnValue(
      asJson([
        organized({ id: "e1", title: "Deskovky" }),
        organized({ id: "e2", title: "Fotovycházka", status: "cancelled" }),
      ]),
    )

    await renderWithQuery(<OrganizingEvents viewerId="u1" />)

    const upcoming = await screen.findByRole("region", { name: "Nadcházející (1)" })
    expect(upcoming).toHaveTextContent("Deskovky")
    expect(screen.getByRole("region", { name: "Zrušené (1)" })).toHaveTextContent("Fotovycházka")
  })

  it("sums up the waiting requests and opens each event's management", async () => {
    get.mockReturnValue(
      asJson([
        organized({ id: "e1", title: "Deskovky", approvedCount: 4, pendingRequests: 2 }),
        organized({ id: "e2", title: "Fotovycházka", status: "cancelled" }),
      ]),
    )

    await renderWithQuery(<OrganizingEvents viewerId="u1" />)

    const summary = await screen.findByRole("status")
    expect(summary).toHaveTextContent("2 žádosti čekají na schválení")
    expect(summary).toHaveTextContent("Deskovky (2)")

    const [deskovky, foto] = screen.getAllByRole("listitem")
    expect(within(deskovky!).getByRole("link", { name: "Deskovky" })).toHaveAttribute(
      "href",
      "/akce/e1/sprava",
    )
    expect(within(deskovky!).getByText("4 z 12 · min. 4 · 2 žádosti")).toBeInTheDocument()
    expect(within(foto!).getByText("Zrušeno")).toBeInTheDocument()

    expect(get).toHaveBeenCalledWith("me/events", { searchParams: { tab: "organizing" } })
  })

  it("leaves „chybí“ to the badge, the line has the count and the minimum (#189)", async () => {
    get.mockReturnValue(
      asJson([organized({ title: "Deskovky", approvedCount: 3, missingToMin: 1 })]),
    )

    await renderWithQuery(<OrganizingEvents viewerId="u1" />)

    const [deskovky] = (await screen.findAllByRole("listitem")) as [HTMLElement]
    expect(within(deskovky).getByText("Chybí 1")).toBeInTheDocument()
    expect(within(deskovky).getByText("3 z 12 · min. 4")).toBeInTheDocument()
    expect(within(deskovky).queryByText(/chybí 1 ·/)).not.toBeInTheDocument()
  })

  it("has no strip without requests", async () => {
    get.mockReturnValue(asJson([organized({ title: "Deskovky" })]))

    await renderWithQuery(<OrganizingEvents viewerId="u1" />)

    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("with nothing organized says so in one sentence", async () => {
    get.mockReturnValue(asJson([]))

    await renderWithQuery(<OrganizingEvents viewerId="u1" />)

    expect(
      await screen.findByText(
        "Zatím nepořádáš žádnou akci. Stačí název, místo a čas – parta se sejde.",
      ),
    ).toBeInTheDocument()
  })
})

// the fixture starts Fri 23. 10. 17:30 in Prague without an end: it ended with that day,
// so it can be rated until Fri 6. 11., 23:59:59.999
describe("PastEvents (Figma C-06, #367)", () => {
  beforeEach(() => get.mockReset())
  const inWindow = new Date("2026-10-24T10:00:00.000Z")

  it("asks for the past tab and lists the events as the API orders them, with how many came", async () => {
    get.mockReturnValue(
      asJson([
        aMyEvent({ id: "e2", title: "Volejbal", approvedCount: 5 }),
        aMyEvent({ id: "e1", title: "Florbal", approvedCount: 7 }),
      ]),
    )

    await renderWithQuery(
      <PastEvents
        viewerId="u-jakub"
        now={inWindow}
      />,
    )

    const past = await screen.findByRole("region", { name: "Proběhlé (2)" })
    const items = within(past).getAllByRole("listitem")
    expect(
      items.map((item) => within(item).getByRole("heading", { level: 3 }).textContent),
    ).toEqual(["Volejbal", "Florbal"])
    expect(within(items[0]!).getByText("Proběhlo")).toBeInTheDocument()
    expect(within(items[0]!).getByText("Sešlo se 5 lidí")).toBeInTheDocument()
    expect(within(items[0]!).getByRole("link", { name: "Volejbal" })).toHaveAttribute(
      "href",
      "/akce/e2",
    )
    expect(get).toHaveBeenCalledWith("me/events", { searchParams: { tab: "past" } })
  })

  it("„Ohodnotit“ leads to the rating page while it can be rated (#66), as Figma: no arrow", async () => {
    get.mockReturnValue(asJson([aMyEvent({ id: "e7", title: "Florbal", approvedCount: 5 })]))

    await renderWithQuery(
      <PastEvents
        viewerId="u-jakub"
        now={inWindow}
      />,
    )

    const rate = await screen.findByRole("link", { name: "Ohodnotit akci Florbal" })
    expect(rate).toHaveAttribute("href", "/akce/e7/hodnoceni")
    expect(rate).toHaveTextContent(/^Ohodnotit$/)
  })

  it("once rated: „tvoje ★ N“ (Figma Dáno) and no „Ohodnotit“, though it could be changed", async () => {
    get.mockReturnValue(asJson([aMyEvent({ title: "Florbal", approvedCount: 5, myEventStars: 4 })]))

    await renderWithQuery(
      <PastEvents
        viewerId="u-jakub"
        now={inWindow}
      />,
    )

    expect(await screen.findByText("Sešlo se 5 lidí · tvoje ★ 4")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Ohodnotit/ })).not.toBeInTheDocument()
  })

  it.each([
    ["after the window", { approvedCount: 5 }, "u-jakub", "2026-11-06T23:00:00.000Z"],
    [
      "below its minimum: it didn't take place",
      { approvedCount: 3, missingToMin: 1 },
      "u-jakub",
      "2026-10-24T10:00:00.000Z",
    ],
    ["the organizer's own event", { approvedCount: 5 }, "u1", "2026-10-24T10:00:00.000Z"],
    [
      "a cancelled event",
      { approvedCount: 5, status: "cancelled" as const },
      "u-jakub",
      "2026-10-24T10:00:00.000Z",
    ],
  ])("no „Ohodnotit“ %s", async (_case, event, viewerId, now) => {
    get.mockReturnValue(asJson([aMyEvent({ title: "Florbal", ...event })]))

    await renderWithQuery(
      <PastEvents
        viewerId={viewerId}
        now={new Date(now)}
      />,
    )

    expect(await screen.findByRole("link", { name: "Florbal" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Ohodnotit/ })).not.toBeInTheDocument()
  })

  // review #368: the rating page would refuse it (RATING_DELETED), so the card doesn't offer it
  it("a rating deleted by moderation: neither stars nor „Ohodnotit“, it can only be restored", async () => {
    get.mockReturnValue(
      asJson([aMyEvent({ title: "Florbal", approvedCount: 5, myRatingDeleted: true })]),
    )

    await renderWithQuery(
      <PastEvents
        viewerId="u-jakub"
        now={inWindow}
      />,
    )

    expect(await screen.findByText("Sešlo se 5 lidí")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Ohodnotit/ })).not.toBeInTheDocument()
  })

  it("a cancelled event says it didn't take place", async () => {
    get.mockReturnValue(asJson([aMyEvent({ status: "cancelled" })]))

    await renderWithQuery(<PastEvents viewerId="u-jakub" />)

    expect(await screen.findByText("Zrušeno")).toBeInTheDocument()
    expect(screen.getByText("Akce se nekonala")).toBeInTheDocument()
  })

  it("with no history says what will be there", async () => {
    get.mockReturnValue(asJson([]))

    await renderWithQuery(<PastEvents viewerId="u-jakub" />)

    expect(
      await screen.findByText("Tady uvidíš proběhlé akce, na které máš schválenou účast."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("on an error offers to try again", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) } as never)
    get.mockReturnValue(asJson([]))

    await renderWithQuery(<PastEvents viewerId="u-jakub" />)

    expect(await screen.findByText("Akce se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(
      await screen.findByText("Tady uvidíš proběhlé akce, na které máš schválenou účast."),
    ).toBeInTheDocument()
  })
})
