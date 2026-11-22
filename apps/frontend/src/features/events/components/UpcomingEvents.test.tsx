import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import { UpcomingEvents } from "@/features/events/components/UpcomingEvents"
import { anEvent } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

// what the API sends: dates as ISO strings
const asJson = (body: unknown) =>
  ({ json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) }) as never

const renderNearest = ({
  localitySlug,
  layout,
}: { localitySlug?: string | null; layout?: "column" | "grid" } = {}) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}>
      <UpcomingEvents
        layout={layout}
        // null: the landing page's default locality is still loading
        locality={
          localitySlug === undefined
            ? undefined
            : {
                slug: localitySlug ?? undefined,
                source: "home",
                isPicked: false,
                pick: vi.fn(),
                forget: vi.fn(),
              }
        }
      />
    </QueryClientProvider>,
  )

describe("UpcomingEvents", () => {
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

  it("names the locality it shows, and with an unknown one falls back to all events without a name", async () => {
    get.mockImplementation(((path: string) =>
      path === "localities"
        ? asJson([
            { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50, lng: 14 },
          ])
        : asJson([anEvent({ title: "Deskovky" })])) as never)

    await renderNearest({ localitySlug: "atlantida" })

    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("events", { searchParams: new URLSearchParams() })
    expect(screen.queryByText("Praha")).not.toBeInTheDocument()
  })

  it("asks for nothing while the default locality is still loading", async () => {
    get.mockImplementation(((path: string) =>
      path === "localities" ? asJson([]) : asJson([anEvent({ title: "Deskovky" })])) as never)

    await renderNearest({ localitySlug: null })

    expect(await screen.findByLabelText("Načítám akce")).toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith("events", expect.anything())
  })

  it("with Celé Česko asks for all events", async () => {
    get.mockImplementation(((path: string) =>
      path === "localities" ? asJson([]) : asJson([anEvent({ title: "Deskovky" })])) as never)

    await renderNearest({ localitySlug: "cele-cesko" })

    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("events", { searchParams: new URLSearchParams() })
  })

  it("when the localities fail, offers to try again and then loads the events", async () => {
    get.mockImplementation(((path: string) =>
      path === "localities"
        ? ({ json: () => Promise.reject(new Error("offline")) } as never)
        : asJson([anEvent({ title: "Deskovky" })])) as never)

    await renderNearest({ localitySlug: "praha" })
    const retry = await screen.findByRole("button", { name: "Zkusit znovu" })

    get.mockImplementation(((path: string) =>
      path === "localities"
        ? asJson([
            { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50, lng: 14 },
          ])
        : asJson([anEvent({ title: "Deskovky" })])) as never)
    await userEvent.click(retry)

    expect(await screen.findByRole("link", { name: "Deskovky" })).toBeInTheDocument()
    expect(screen.getByText("Praha")).toBeInTheDocument()
  })

  // review #397: the sign-in pages keep their column, the 404 gets the landing page's grid
  describe("layout", () => {
    const three = () => ["e1", "e2", "e3"].map((id) => anEvent({ id, title: `Akce ${id}` }))

    it("by default a column of row cards (sign-in, sign-up)", async () => {
      get.mockReturnValue(asJson(three()))
      const { container } = await renderNearest()

      await screen.findByRole("link", { name: "Akce e1" })
      expect(container.querySelector("ul")).toHaveClass("flex-col")
      expect(container.querySelector("ul")).not.toHaveClass("grid")
    })

    it("grid: a column per card from md, never an empty one", async () => {
      get.mockReturnValue(asJson(three().slice(0, 2)))
      const { container } = await renderNearest({ layout: "grid" })

      await screen.findByRole("link", { name: "Akce e1" })
      expect(container.querySelector("ul")).toHaveClass("grid", "md:grid-cols-2")
    })

    it("grid: while loading, the skeleton is the same grid, so nothing jumps", async () => {
      get.mockReturnValue({ json: () => new Promise<never>(() => undefined) } as never)
      await renderNearest({ layout: "grid" })

      expect(screen.getByLabelText("Načítám akce")).toHaveClass("grid", "md:grid-cols-3")
    })
  })
})
