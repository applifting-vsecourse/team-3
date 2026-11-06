import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { PublicProfile } from "@/features/users/api/publicProfile"

import { PublicProfileView } from "./PublicProfileView"

const empty = { average: null, count: 0 }
const profile = (changes: Partial<PublicProfile> = {}): PublicProfile => ({
  id: "user",
  name: "Jana Svobodová",
  interests: [{ id: "run", name: "Běh" }],
  participantSummary: empty,
  organizerSummary: empty,
  eventSummary: empty,
  participantRatings: [],
  organizedEvents: [],
  ...changes,
})

describe("public profile", () => {
  it("shows only public identity, interests and empty ratings; hides absent organized-event history", async () => {
    await renderWithRouter(
      <PublicProfileView
        profile={profile()}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Jana Svobodová" })).toBeInTheDocument()
    expect(screen.getByText("Běh")).toBeInTheDocument()
    expect(screen.getByText("Zatím žádné hodnocení od organizátorů.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Pořádané akce" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /upravit|přihlásit/i })).not.toBeInTheDocument()
  })
  it("shows ratings and counts, links public references, renders comments as text and keeps private events unlinked", async () => {
    await renderWithRouter(
      <PublicProfileView
        onRetry={vi.fn()}
        profile={profile({
          participantSummary: { average: 4.5, count: 2 },
          organizerSummary: { average: 3.5, count: 1 },
          eventSummary: { average: 4, count: 1 },
          participantRatings: [
            {
              id: "r1",
              stars: 5,
              comment: "<script>untrusted()</script>",
              createdAt: new Date("2026-11-01"),
              author: { id: "host", name: "Petr" },
              event: { id: "public-event", title: "Veřejný volejbal" },
            },
            {
              id: "r2",
              stars: 4,
              comment: null,
              createdAt: new Date("2026-11-02"),
              author: null,
              event: null,
            },
          ],
          organizedEvents: [
            {
              id: "past-event",
              title: "Společný běh",
              startsAt: new Date("2026-10-25"),
              endsAt: null,
              localityName: "Praha",
              activityName: "Běh",
              approvedCount: 3,
              rating: { average: 4, count: 1 },
            },
          ],
        })}
      />,
    )
    expect(screen.getByText("4,5 / 5")).toBeInTheDocument()
    expect(screen.getByText("Počet hodnocení: 2")).toBeInTheDocument()
    expect(screen.getByText("Počet účastníků: 3")).toBeInTheDocument()
    expect(screen.getByLabelText("5 z 5 hvězdiček")).toBeInTheDocument()
    expect(screen.getByText("<script>untrusted()</script>")).toBeInTheDocument()
    expect(document.querySelector("script")).toBeNull()
    expect(screen.getByRole("link", { name: "Petr" })).toHaveAttribute("href", "/uzivatele/host")
    expect(screen.getByRole("link", { name: "Veřejný volejbal" })).toHaveAttribute(
      "href",
      "/akce/public-event",
    )
    expect(screen.getByText("Neveřejná akce").closest("a")).toBeNull()
    expect(screen.getByRole("heading", { name: "Pořádané akce" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Společný běh" })).toHaveAttribute(
      "href",
      "/akce/past-event",
    )
  })
  it("shows a loading state, an unavailable profile, and a retryable error without stale profile data", async () => {
    const retry = vi.fn()
    const view = await renderWithRouter(
      <PublicProfileView
        isLoading
        onRetry={retry}
      />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("Načítání profilu")
    view.rerender(
      <PublicProfileView
        isNotFound
        onRetry={retry}
      />,
    )
    expect(screen.getByRole("heading", { name: "Profil nenalezen" })).toBeInTheDocument()
    view.rerender(
      <PublicProfileView
        profile={profile()}
        error={new Error("offline")}
        onRetry={retry}
      />,
    )
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("Jana Svobodová")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
