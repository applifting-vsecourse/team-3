import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventDetail } from "@/features/events/api/eventSchemas"

import { ManagedRatings } from "./ManagedRatings"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

beforeEach(() => {
  api.get.mockReset()
  api.get.mockReturnValue({
    json: () =>
      Promise.resolve({
        summary: { event: { average: 4.5, count: 2 }, organizer: { average: 4, count: 2 } },
        ratings: [],
      }),
  })
})

// a past event as the management page has it (GET /api/events/:id)
const event = {
  id: "e1",
  title: "Volejbal na Letné",
  startsAt: new Date("2026-11-01T18:00:00.000Z"),
  endsAt: new Date("2026-11-01T20:00:00.000Z"),
  address: "Sportovní areál Letná, Praha 7",
  lat: 50.1,
  lng: 14.4,
  activity: {
    id: "a1",
    slug: "volejbal",
    name: "Volejbal",
    category: { id: "c1", slug: "tymove-sporty", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l1", slug: "praha-7", name: "Praha 7" },
  organizer: { id: "u-petra", name: "Petra Nováková" },
  group: null,
  minParticipants: 4,
  maxParticipants: 12,
  approvedCount: 5,
  missingToMin: 0,
  freeSpots: 7,
  isFull: false,
  isPromoted: false,
  summary: null,
  distanceKm: null,
  description: null,
  approvalMode: "open",
  visibility: "public",
  status: "published",
  cancelReason: null,
  participants: [],
  myParticipation: null,
  viewerSignedIn: true,
  canManage: true,
} satisfies EventDetail

const dayAfter = new Date("2026-11-02T10:00:00.000Z")
const afterWindow = new Date("2026-11-16T10:00:00.000Z")

const renderRatings = (overrides: Partial<EventDetail>, viewerId: string | null, now: Date) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ManagedRatings
        event={{ ...event, ...overrides }}
        viewerId={viewerId}
        now={now}
      />
    </QueryClientProvider>,
  )

const rateLink = () => screen.queryByRole("link", { name: "Ohodnotit účastníky" })
const section = () => screen.queryByRole("region", { name: "Jak akci hodnotili" })

describe("ratings on the event's management page (B-060, #66, review #322)", () => {
  it("its creator, within the window: both the link to D-05 and how they rated", async () => {
    await renderRatings({}, "u-petra", dayAfter)

    expect(rateLink()).toHaveAttribute("href", "/akce/e1/hodnoceni")
    expect(section()).toBeInTheDocument()
    expect(await screen.findByText("Organizátor")).toBeInTheDocument()
  })

  it("after the window: how they rated, no link", async () => {
    await renderRatings({}, "u-petra", afterWindow)

    expect(section()).toBeInTheDocument()
    expect(rateLink()).not.toBeInTheDocument()
  })

  it("a group's other admin: how they rated, no link (the API says NOT_ORGANIZER)", async () => {
    await renderRatings({ group: { id: "g1", name: "Volejbal Letná" } }, "u-admin", dayAfter)

    expect(section()).toBeInTheDocument()
    expect(rateLink()).not.toBeInTheDocument()
    expect(await screen.findByText("Skupina")).toBeInTheDocument()
  })

  it.each([
    ["before it ends", {}, new Date("2026-11-01T19:00:00.000Z")],
    ["a cancelled event", { status: "cancelled" as const }, dayAfter],
    ["an event below its minimum", { approvedCount: 3, missingToMin: 1 }, dayAfter],
  ])("nothing %s", async (_when, overrides, now) => {
    await renderRatings(overrides, "u-petra", now)

    expect(section()).not.toBeInTheDocument()
    expect(rateLink()).not.toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })
})
