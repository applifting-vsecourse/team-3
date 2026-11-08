import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EventMessages } from "@/features/events/components/EventMessages"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

// Figma A-05c: the illustrative message, and an older one under it
const messages = [
  {
    id: "m2",
    subject: "Hrajeme v malé tělocvičně",
    body: "Sraz v 17:50 u vchodu z ulice Na Pankráci.\nVezmi si sálovky, míče mám.",
    createdAt: "2026-10-23T14:20:00Z",
    sender: { id: "u-petr", name: "Petr Holub" },
  },
  {
    id: "m1",
    subject: "Vítej v partě",
    body: "Hrajeme každý týden.",
    createdAt: "2026-10-20T16:00:00Z",
    sender: { id: "u-petr", name: "Petr Holub" },
  },
]

const renderSection = ({ isOrganizer = false } = {}) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EventMessages
        eventId="e08"
        viewerId="u-jakub"
        isOrganizer={isOrganizer}
      />
    </QueryClientProvider>,
  )

beforeEach(() => {
  api.get.mockReset().mockReturnValue({
    json: () => Promise.resolve({ messages, total: 2, remainingToday: null }),
  })
})

describe("EventMessages (#176)", () => {
  it("lists them newest first: who and when, the subject and the text as written", async () => {
    renderSection()

    const section = await screen.findByRole("region", { name: "Zprávy od organizátora (2)" })
    const [latest, older] = within(section).getAllByRole("listitem")
    expect(within(latest!).getByText("pá 23. 10. v 16:20")).toBeInTheDocument()
    expect(within(latest!).getByText(/Petr Holub ·/)).toBeInTheDocument()
    expect(
      within(latest!).getByRole("heading", { name: "Hrajeme v malé tělocvičně" }),
    ).toBeInTheDocument()
    // the line break stays (whitespace-pre-line)
    expect(within(latest!).getByText(/Na Pankráci\. Vezmi si/).textContent).toBe(messages[0]!.body)
    expect(within(older!).getByRole("heading", { name: "Vítej v partě" })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("events/e08/messages")
  })

  it("none yet says what would be here", async () => {
    api.get.mockReturnValue({
      json: () => Promise.resolve({ messages: [], total: 0, remainingToday: null }),
    })
    renderSection()

    expect(await screen.findByText(/Až organizátor něco napíše/)).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Zprávy od organizátora" })).toBeInTheDocument()
  })

  it("the organizer's empty section points to „Napsat účastníkům“", async () => {
    api.get.mockReturnValue({
      json: () => Promise.resolve({ messages: [], total: 0, remainingToday: 10 }),
    })
    renderSection({ isOrganizer: true })

    expect(await screen.findByText(/přes „Napsat účastníkům“ ve správě akce/)).toBeInTheDocument()
  })

  it("the heading counts all of them, not only the latest 50 in the list", async () => {
    api.get.mockReturnValue({
      json: () => Promise.resolve({ messages, total: 70, remainingToday: null }),
    })
    renderSection()

    expect(
      await screen.findByRole("region", { name: "Zprávy od organizátora (70)" }),
    ).toBeInTheDocument()
  })

  it("shows it is loading", () => {
    // never answers
    api.get.mockReturnValue({ json: () => new Promise(vi.fn()) })
    renderSection()

    expect(screen.getByLabelText("Načítám zprávy")).toBeInTheDocument()
  })

  it("a failure says so and can be retried", async () => {
    api.get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    renderSection()

    expect(await screen.findByText("Zprávy se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(
      await screen.findByRole("region", { name: "Zprávy od organizátora (2)" }),
    ).toBeInTheDocument()
  })
})
