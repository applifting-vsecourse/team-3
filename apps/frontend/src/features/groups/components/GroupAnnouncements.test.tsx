import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GroupAnnouncements } from "@/features/groups/components/GroupAnnouncements"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

// Figma A-08e: the illustrative announcement, and an older one under it
const announcements = [
  {
    id: "an2",
    subject: "Přes svátky se nehraje",
    body: "Poslední hra v roce bude 16. 12., pak pauza do 6. 1.\nAkce na leden založím do konce prosince.",
    createdAt: "2026-10-22T18:10:00Z",
    sender: { id: "u-tomas", name: "Tomáš Dvořák" },
  },
  {
    id: "an1",
    subject: "Nové dresy",
    body: "Dresy jsou v šatně.",
    createdAt: "2026-10-01T16:00:00Z",
    sender: { id: "u-tomas", name: "Tomáš Dvořák" },
  },
]

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GroupAnnouncements
        groupId="g-florbal"
        viewerId="u-jakub"
      />
    </QueryClientProvider>,
  )

beforeEach(() => {
  api.get.mockReset().mockReturnValue({
    json: () => Promise.resolve({ announcements, remainingToday: null }),
  })
})

describe("GroupAnnouncements (#194)", () => {
  it("lists them newest first: who and when, the subject and the text as written", async () => {
    renderSection()

    const section = await screen.findByRole("region", { name: "Oznámení (2)" })
    const [latest, older] = within(section).getAllByRole("listitem")
    expect(within(latest!).getByText("čt 22. 10. v 20:10")).toBeInTheDocument()
    expect(within(latest!).getByText(/Tomáš Dvořák ·/)).toBeInTheDocument()
    expect(
      within(latest!).getByRole("heading", { name: "Přes svátky se nehraje" }),
    ).toBeInTheDocument()
    // the line break stays (whitespace-pre-line)
    expect(within(latest!).getByText(/pauza do 6\. 1\. Akce na leden/).textContent).toBe(
      announcements[0]!.body,
    )
    expect(within(older!).getByRole("heading", { name: "Nové dresy" })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("groups/g-florbal/announcements")
  })

  it("none yet says what would be here", async () => {
    api.get.mockReturnValue({
      json: () => Promise.resolve({ announcements: [], remainingToday: null }),
    })
    renderSection()

    expect(await screen.findByText(/Zatím tu žádné oznámení není\./)).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Oznámení" })).toBeInTheDocument()
  })

  it("shows it is loading", () => {
    // never answers
    api.get.mockReturnValue({ json: () => new Promise(vi.fn()) })
    renderSection()

    expect(screen.getByLabelText("Načítám oznámení")).toBeInTheDocument()
  })

  it("a failure says so and can be retried", async () => {
    api.get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    renderSection()

    expect(await screen.findByText("Oznámení se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByRole("region", { name: "Oznámení (2)" })).toBeInTheDocument()
  })
})
