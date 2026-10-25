import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import { NearestEvents } from "@/features/events/components/NearestEvents"
import { anEvent } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

// what the API sends: dates as ISO strings
const asJson = (body: unknown) =>
  ({ json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) }) as never

const renderNearest = (props: { localitySlug?: string } = {}) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}>
      <NearestEvents {...props} />
    </QueryClientProvider>,
  )

describe("NearestEvents", () => {
  beforeEach(() => get.mockReset())

  it("shows the three soonest events, each a link to its detail", async () => {
    get.mockReturnValue(
      asJson(["e1", "e2", "e3", "e4"].map((id) => anEvent({ id, title: `Akce ${id}` }))),
    )

    await renderNearest()

    expect(await screen.findByRole("link", { name: "Akce e1" })).toHaveAttribute("href", "/akce/e1")
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.queryByRole("link", { name: "Akce e4" })).not.toBeInTheDocument()
  })

  it("says so in one sentence when nothing is coming", async () => {
    get.mockReturnValue(asJson([]))

    await renderNearest()

    expect(await screen.findByText("Teď nejsou žádné nadcházející akce.")).toBeInTheDocument()
  })

  it("on an error offers to try again", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) } as never)
    get.mockReturnValueOnce(asJson([anEvent({ title: "Deskovky" })]))

    await renderNearest()

    await userEvent.click(await screen.findByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
  })

  it("with a locality, asks only for its events once the catalog knows its id", async () => {
    get.mockImplementation(((path: string) =>
      path === "localities"
        ? asJson([
            { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50, lng: 14 },
          ])
        : asJson([anEvent({ title: "Deskovky" })])) as never)

    await renderNearest({ localitySlug: "praha" })

    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith("events", {
      searchParams: new URLSearchParams(),
    })
    expect(get).toHaveBeenCalledWith("events", {
      searchParams: new URLSearchParams({ localityId: "l-praha" }),
    })
  })
})
