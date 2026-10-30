import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import { PopularEvents } from "@/features/events/components/PopularEvents"
import { anEvent } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

// what the API sends: dates as ISO strings
const asJson = (body: unknown) =>
  ({ json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) }) as never

const renderPopular = () =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}>
      <PopularEvents footer={<a href="/akce">Zobrazit všechny akce</a>} />
    </QueryClientProvider>,
  )

describe("PopularEvents", () => {
  beforeEach(() => get.mockReset())

  it("asks the API for the six events with the most interest", async () => {
    get.mockReturnValue(asJson([anEvent({ title: "Deskovky" })]))

    await renderPopular()

    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
    // the API ranks every event; the browser never sorts one page of the soonest ones
    expect(get).toHaveBeenCalledWith("events", { searchParams: { sort: "popular", limit: 6 } })
  })

  it("keeps the API's order, though later events come first, and each card opens its detail", async () => {
    // most interest first: the busiest event is the latest one
    get.mockReturnValue(
      asJson([
        anEvent({ id: "busy", title: "Volejbal", startsAt: new Date("2026-11-20T16:00:00Z") }),
        anEvent({ id: "middle", title: "Běh", startsAt: new Date("2026-11-02T16:00:00Z") }),
        anEvent({ id: "quiet", title: "Deskovky", startsAt: new Date("2026-10-27T16:00:00Z") }),
      ]),
    )

    await renderPopular()

    const region = await screen.findByRole("region", { name: "O tyhle akce je zájem" })
    await within(region).findByRole("link", { name: "Volejbal" })
    expect(
      within(region)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Volejbal", "Běh", "Deskovky"])
    expect(within(region).getByRole("link", { name: "Volejbal" })).toHaveAttribute(
      "href",
      "/akce/busy",
    )
    expect(within(region).getByText("Celé Česko")).toBeInTheDocument()
  })

  it("shows the six cards it got and the footer", async () => {
    get.mockReturnValue(
      asJson(
        ["e1", "e2", "e3", "e4", "e5", "e6"].map((id) => anEvent({ id, title: `Akce ${id}` })),
      ),
    )

    await renderPopular()

    expect(await screen.findAllByRole("link", { name: /^Akce e/ })).toHaveLength(6)
    expect(screen.getByRole("link", { name: "Zobrazit všechny akce" })).toBeInTheDocument()
  })

  it("says so in one sentence when nothing is coming", async () => {
    get.mockReturnValue(asJson([]))

    await renderPopular()

    expect(await screen.findByText("Teď nejsou žádné nadcházející akce.")).toBeInTheDocument()
  })

  it("on an error offers to try again", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) } as never)
    get.mockReturnValueOnce(asJson([anEvent({ title: "Deskovky" })]))

    await renderPopular()

    await userEvent.click(await screen.findByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
  })
})
