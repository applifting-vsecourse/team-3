import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { PublicOrganizedEvent, PublicProfile } from "@/features/users/api/publicProfile"

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

// the events feature's PastEventCard, whose texts PastEventCard.test.tsx checks
const card = (event: PublicOrganizedEvent) => (
  <a href={`/akce/${event.id}`}>
    {event.title} · {event.approvedCount} · {event.activity.slug}
  </a>
)

describe("public profile", () => {
  it("shows only public identity, interests and empty ratings; hides absent organized-event history", async () => {
    await renderWithRouter(
      <PublicProfileView
        profile={profile()}
        onRetry={vi.fn()}
        renderOrganizedEvent={card}
      />,
    )
    const name = screen.getByRole("heading", { level: 1, name: "Jana Svobodová" })
    // who it is sits in the dark band with the way back (DESIGN.md › Layout)
    expect(name.closest(".on-hero")).not.toBeNull()
    expect(screen.getByRole("link", { name: "Všechny akce" })).toHaveAttribute("href", "/akce")
    expect(screen.getByText("Běh").closest(".on-hero")).not.toBeNull()
    expect(
      screen.getByText("Jako účastník zatím bez hodnocení · Jako organizátor zatím bez hodnocení"),
    ).toBeInTheDocument()
    // two columns on desktop (DESIGN.md › Layout), each heading with one keyword
    const participant = screen.getByRole("heading", { level: 2, name: "Jako účastník" })
    expect(participant.closest("section")?.parentElement).toHaveClass("lg:grid-cols-2")
    expect(participant.querySelector(".highlight-keyword")).toHaveTextContent("účastník")
    expect(screen.getByText("Zatím žádné hodnocení od organizátorů.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Pořádané akce" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /upravit|přihlásit/i })).not.toBeInTheDocument()
  })
  it("shows ratings and counts, links public references, renders comments as text and explains ratings left out from non-public events", async () => {
    await renderWithRouter(
      <PublicProfileView
        onRetry={vi.fn()}
        renderOrganizedEvent={card}
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
          ],
          organizedEvents: [
            {
              id: "past-event",
              title: "Společný běh",
              startsAt: new Date("2026-10-25"),
              endsAt: null,
              localityName: "Praha",
              activityName: "Běh",
              address: "Stromovka, Praha 7",
              locality: { id: "praha", slug: "praha", name: "Praha" },
              activity: {
                id: "beh",
                slug: "beh",
                name: "Běh",
                category: { id: "sport", slug: "sport", name: "Sport", icon: "ball" },
              },
              approvedCount: 3,
              missingToMin: 0,
              rating: { average: 4, count: 1 },
            },
          ],
        })}
      />,
    )
    expect(screen.getByText("★ 4,5")).toBeInTheDocument()
    expect(screen.getByText("(2 hodnocení)")).toBeInTheDocument()
    // the band sums up both roles (DESIGN.md › Copy: an average always shows its count)
    expect(
      screen.getByText("Jako účastník ★ 4,5 (2 hodnocení) · Jako organizátor ★ 3,5 (1 hodnocení)"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("5 z 5 hvězdiček")).toBeInTheDocument()
    expect(screen.getByText("<script>untrusted()</script>")).toBeInTheDocument()
    expect(document.querySelector("script")).toBeNull()
    expect(screen.getByRole("link", { name: "Petr" })).toHaveAttribute("href", "/uzivatele/host")
    expect(screen.getByRole("link", { name: "Veřejný volejbal" })).toHaveAttribute(
      "href",
      "/akce/public-event",
    )
    expect(
      screen.getByText("Další hodnocení jsou z neveřejných akcí, počítají se jen do průměru."),
    ).toBeInTheDocument()
    const organized = screen.getByRole("heading", { level: 2, name: "Pořádané akce" })
    expect(organized.querySelector(".highlight-keyword")).toHaveTextContent("Pořádané")
    expect(screen.getByRole("link", { name: "Společný běh · 3 · beh" })).toHaveAttribute(
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
        renderOrganizedEvent={card}
      />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("Načítání profilu")
    view.rerender(
      <PublicProfileView
        isNotFound
        onRetry={retry}
        renderOrganizedEvent={card}
      />,
    )
    expect(screen.getByRole("heading", { name: "Profil nenalezen" })).toBeInTheDocument()
    view.rerender(
      <PublicProfileView
        profile={profile()}
        error={new Error("offline")}
        onRetry={retry}
        renderOrganizedEvent={card}
      />,
    )
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("Jana Svobodová")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
