import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import { AttendingEvents, OrganizingEvents } from "@/features/events/components/MyEvents"
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

describe("AttendingEvents", () => {
  beforeEach(() => get.mockReset())

  it("asks for the attending tab and shows waiting requests apart from places", async () => {
    get.mockReturnValue(
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
    expect(within(waiting).getByText("Čeká na schválení")).toBeInTheDocument()

    const confirmed = screen.getByRole("region", { name: "Potvrzené (2)" })
    const [florbal, volejbal] = within(confirmed).getAllByRole("listitem")
    expect(within(florbal!).getByText("Jdu")).toBeInTheDocument()
    expect(within(volejbal!).getByText("Zrušeno")).toBeInTheDocument()

    expect(get).toHaveBeenCalledWith("me/events", { searchParams: { tab: "attending" } })
  })

  it("leaves out a section with nothing in it", async () => {
    get.mockReturnValue(asJson([aMyEvent()]))

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    expect(await screen.findByRole("heading", { name: "Potvrzené (1)" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /Čeká na schválení/ })).not.toBeInTheDocument()
  })

  it("says in one sentence that I go nowhere yet, with the way to the events", async () => {
    get.mockReturnValue(asJson([]))

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    expect(await screen.findByText("Zatím nejdeš na žádnou akci.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Projít akce" })).toHaveAttribute("href", "/akce")
  })

  it("on an error offers to try again", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) } as never)
    get.mockReturnValueOnce(asJson([]))

    await renderWithQuery(<AttendingEvents viewerId="u1" />)

    expect(await screen.findByText("Akce se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByText("Zatím nejdeš na žádnou akci.")).toBeInTheDocument()
  })
})

describe("OrganizingEvents", () => {
  beforeEach(() => get.mockReset())

  const organized = (overrides: Parameters<typeof aMyEvent>[0]) =>
    aMyEvent({ myParticipation: null, pendingRequests: 0, ...overrides })

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
    expect(within(deskovky!).getByText("4/12 · 2 žádosti")).toBeInTheDocument()
    expect(within(foto!).getByText("Zrušeno")).toBeInTheDocument()

    expect(get).toHaveBeenCalledWith("me/events", { searchParams: { tab: "organizing" } })
  })

  it("has no strip without requests", async () => {
    get.mockReturnValue(asJson([organized({ title: "Deskovky" })]))

    await renderWithQuery(<OrganizingEvents viewerId="u1" />)

    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("with nothing organized says so, and „Založit akci“ is there either way", async () => {
    get.mockReturnValue(asJson([]))

    await renderWithQuery(<OrganizingEvents viewerId="u1" />)

    expect(await screen.findByText("Zatím nepořádáš žádnou akci.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Založit akci" })).toHaveAttribute("href", "/akce/nova")
  })
})
