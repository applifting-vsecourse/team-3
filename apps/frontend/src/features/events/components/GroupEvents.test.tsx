import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { GroupEvent } from "@/features/events/api/eventSchemas"
import { groupEventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { GroupEvents } from "@/features/events/components/GroupEvents"
import { anEvent } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", () => ({ api: { get: vi.fn() } }))

const aGroupEvent = (overrides: Partial<GroupEvent> = {}): GroupEvent => ({
  ...anEvent(),
  visibility: "public",
  ...overrides,
})

const render = async (events: { upcoming: GroupEvent[]; past: GroupEvent[] }) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(groupEventsQueryOptions("g1", "u-jakub", "active").queryKey, events)
  await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <GroupEvents
        groupId="g1"
        viewerId="u-jakub"
        membership="active"
      />
    </QueryClientProvider>,
  )
}

// Figma A-08e (#70)
describe("GroupEvents", () => {
  it("lists the upcoming and the past events; members-only ones say so", async () => {
    await render({
      upcoming: [
        aGroupEvent({ id: "e06", title: "Volná hra" }),
        aGroupEvent({ id: "e38", title: "Plná sestava", visibility: "members" }),
      ],
      past: [aGroupEvent({ id: "e01", title: "Středeční florbal", approvedCount: 6 })],
    })

    const upcoming = screen.getByRole("region", { name: "Nadcházející akce skupiny" })
    expect(within(upcoming).getAllByRole("listitem")).toHaveLength(2)
    expect(within(upcoming).getByText(/jen pro členy/)).toBeInTheDocument()
    const past = screen.getByRole("region", { name: "Proběhlé akce skupiny" })
    expect(within(past).getByRole("link", { name: "Středeční florbal" })).toHaveAttribute(
      "href",
      "/akce/e01",
    )
    expect(within(past).getByText("Proběhlo")).toBeInTheDocument()
    expect(within(past).getByText(/· sešlo se 6$/)).toBeInTheDocument()
  })

  it("a past event below its minimum: „Nekonalo se“ and why (#61)", async () => {
    await render({
      upcoming: [],
      past: [aGroupEvent({ id: "e02", title: "Prázdná hala", approvedCount: 2, missingToMin: 2 })],
    })

    const past = screen.getByRole("region", { name: "Proběhlé akce skupiny" })
    expect(within(past).getByText("Nekonalo se")).toBeInTheDocument()
    expect(within(past).getByText(/· do minima chyběli 2 lidé$/)).toBeInTheDocument()
    // it no longer fills up: no capacity bar, as for „Proběhlo“
    expect(past.querySelector("[data-slot=capacity-track]")).toBeNull()
  })

  it("an event going on right now stays upcoming and says „Probíhá“, without the bar (#272)", async () => {
    const hour = 60 * 60 * 1000
    await render({
      upcoming: [
        aGroupEvent({
          id: "e03",
          title: "Zápas právě teď",
          startsAt: new Date(Date.now() - hour),
          endsAt: new Date(Date.now() + hour),
        }),
      ],
      past: [],
    })

    const upcoming = screen.getByRole("region", { name: "Nadcházející akce skupiny" })
    expect(within(upcoming).getByText("Probíhá")).toBeInTheDocument()
    expect(upcoming.querySelector("[data-slot=capacity-track]")).toBeNull()
  })

  it("says when nothing is planned, and leaves out an empty history", async () => {
    await render({ upcoming: [], past: [] })

    expect(screen.getByText("Skupina zatím nemá naplánovanou žádnou akci.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Proběhlé akce skupiny" })).not.toBeInTheDocument()
  })
})
