import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { ReceivedRatings } from "./ReceivedRatings"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const asJson = (body: unknown) => ({ json: () => Promise.resolve(body) })

const received = {
  summary: { event: { average: 4.5, count: 2 }, organizer: { average: 4, count: 2 } },
  ratings: [
    {
      author: { id: "u-jakub", name: "Jakub Král" },
      eventStars: 5,
      organizerStars: 4,
      comment: "Skvělá parta, příště zase.",
      updatedAt: "2026-10-20T08:00:00.000Z",
    },
    {
      author: { id: "u-lucie", name: "Lucie Horáková" },
      eventStars: 4,
      organizerStars: 4,
      comment: null,
      updatedAt: "2026-10-19T20:00:00.000Z",
    },
  ],
}

let answer: unknown = received

beforeEach(() => {
  answer = received
  api.get.mockReset()
  api.get.mockImplementation((path: string) => {
    if (path !== "events/e1/ratings") throw new Error(`unexpected ${path}`)
    return asJson(answer)
  })
})

const renderSection = (isGroupEvent = false, isRatingOpen = true) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ReceivedRatings
        eventId="e1"
        viewerId="u-petra"
        isGroupEvent={isGroupEvent}
        isRatingOpen={isRatingOpen}
      />
    </QueryClientProvider>,
  )

describe("what the event got, on its management page (B-060, #66)", () => {
  it("the averages with their counts, then each rating with its comment", async () => {
    await renderSection()

    const section = await screen.findByRole("region", { name: "Jak akci hodnotili" })
    expect(await within(section).findByText("★ 4,5 (2 hodnocení)")).toBeInTheDocument()
    expect(within(section).getByText("Organizátor")).toBeInTheDocument()
    expect(within(section).getByText("★ 4 (2 hodnocení)")).toBeInTheDocument()

    const items = within(section).getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText("akce ★ 5 · organizátor ★ 4")).toBeInTheDocument()
    expect(within(items[0]!).getByText("„Skvělá parta, příště zase.“")).toBeInTheDocument()
    expect(within(items[1]!).getByText("Lucie Horáková")).toBeInTheDocument()
  })

  it("a group's event: the organizer stars are the group's", async () => {
    await renderSection(true)

    expect(await screen.findByText("Skupina")).toBeInTheDocument()
    expect(screen.getAllByText(/· skupina ★ 4$/)).toHaveLength(2)
  })

  it("nobody rated yet: says so, never a bare 0", async () => {
    answer = {
      summary: { event: { average: null, count: 0 }, organizer: { average: null, count: 0 } },
      ratings: [],
    }
    await renderSection()

    expect(
      await screen.findByText("Zatím nikdo nehodnotil. Účastníci mohou hodnotit 14 dní po akci."),
    ).toBeInTheDocument()
    expect(screen.getAllByText("zatím bez hodnocení")).toHaveLength(2)
  })

  it("after the window nobody can rate any more: it doesn't say they can (review #322)", async () => {
    answer = {
      summary: { event: { average: null, count: 0 }, organizer: { average: null, count: 0 } },
      ratings: [],
    }
    await renderSection(false, false)

    expect(await screen.findByText("Akci nikdo neohodnotil.")).toBeInTheDocument()
    expect(screen.queryByText(/mohou hodnotit/)).not.toBeInTheDocument()
  })
})
