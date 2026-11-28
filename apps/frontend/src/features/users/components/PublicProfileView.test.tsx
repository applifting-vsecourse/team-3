import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type {
  PublicOrganizedEvent,
  PublicProfile,
  PublicUpcomingEvent,
} from "@/features/users/api/publicProfile"

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
  friendship: null,
  upcomingEvents: null,
  ...changes,
})

// the events feature's PastEventCard, whose texts PastEventCard.test.tsx checks
const card = (event: PublicOrganizedEvent) => (
  <a href={`/akce/${event.id}`}>
    {event.title} · {event.approvedCount} · {event.activity.slug}
  </a>
)

// the events feature's EventCard, whose badges EventCard.test.tsx checks
const upcomingCard = (event: PublicUpcomingEvent) => <a href={`/akce/${event.id}`}>{event.title}</a>

describe("public profile", () => {
  it("shows only public identity, interests and empty ratings; hides absent organized-event history", async () => {
    await renderWithRouter(
      <PublicProfileView
        profile={profile()}
        onRetry={vi.fn()}
        renderOrganizedEvent={card}
        renderUpcomingEvent={upcomingCard}
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
    expect(participant.closest('[class~="lg:grid-cols-2"]')).not.toBeNull()
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
        renderUpcomingEvent={upcomingCard}
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
    expect(screen.getByRole("img", { name: "5 z 5 hvězd" })).toBeInTheDocument()
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
        renderUpcomingEvent={upcomingCard}
      />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("Načítání profilu")
    view.rerender(
      <PublicProfileView
        isNotFound
        onRetry={retry}
        renderOrganizedEvent={card}
        renderUpcomingEvent={upcomingCard}
      />,
    )
    expect(screen.getByRole("heading", { name: "Profil nenalezen" })).toBeInTheDocument()
    view.rerender(
      <PublicProfileView
        profile={profile()}
        error={new Error("offline")}
        onRetry={retry}
        renderOrganizedEvent={card}
        renderUpcomingEvent={upcomingCard}
      />,
    )
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("Jana Svobodová")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(retry).toHaveBeenCalledOnce()
  })
})

const anUpcomingEvent = (id: string, title: string): PublicUpcomingEvent => ({
  id,
  title,
  startsAt: new Date("2026-11-25T17:00:00Z"),
  endsAt: null,
  address: "Sportovní hala Prosek, Praha 9",
  lat: 50.1,
  lng: 14.5,
  activity: {
    id: "a1",
    slug: "florbal",
    name: "Florbal",
    category: { id: "c1", slug: "tymove-sporty", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l1", slug: "praha-9", name: "Praha 9" },
  organizer: { id: "org", name: "Tomáš" },
  group: null,
  minParticipants: 6,
  maxParticipants: 12,
  approvalMode: "open",
  approvedCount: 5,
  missingToMin: 1,
  freeSpots: 7,
  isFull: false,
  isPromoted: false,
  summary: null,
  distanceKm: null,
})

describe("friends on the public profile (#307, Figma B-07f, B-07g)", () => {
  const show = (changes: Partial<PublicProfile>) =>
    renderWithRouter(
      <PublicProfileView
        profile={profile(changes)}
        onRetry={vi.fn()}
        renderOrganizedEvent={card}
        renderUpcomingEvent={upcomingCard}
        friendshipAction={<button type="button">Přidat do přátel</button>}
      />,
    )
  const upcoming = () => screen.getByRole("region", { name: "Kam jde" })

  it("a friend sees Kam jde: the events the API sent, and that they are only those open to them", async () => {
    await show({
      friendship: "friends",
      upcomingEvents: [anUpcomingEvent("e1", "Florbal – trénink"), anUpcomingEvent("e2", "Běh")],
    })

    expect(Array.from(upcoming().querySelectorAll("li"), (item) => item.textContent)).toEqual([
      "Florbal – trénink",
      "Běh",
    ])
    expect(
      screen.getByText("Jen nadcházející akce, které jsou přístupné i tobě."),
    ).toBeInTheDocument()
    expect(upcoming().querySelector(".highlight-keyword")).toHaveTextContent("jde")
  })

  it("a friend going nowhere yet", async () => {
    await show({ friendship: "friends", upcomingEvents: [] })

    expect(screen.getByText("Zatím nemá žádné nadcházející akce.")).toBeInTheDocument()
  })

  it.each([
    ["a visitor", null],
    ["no friend", "none"],
    ["my request waits", "outgoing"],
    ["their request waits", "incoming"],
  ] as const)("%s: only that friends see where they go", async (_case, friendship) => {
    await show({ friendship })

    expect(screen.getByText("Kam chodí, vidí jen přátelé.")).toBeInTheDocument()
    expect(upcoming().querySelector("li")).toBeNull()
  })

  it("on one's own profile no Kam jde: one's events are in Moje", async () => {
    await show({ friendship: "self" })

    expect(screen.queryByRole("region", { name: "Kam jde" })).not.toBeInTheDocument()
  })

  it("the friendship's block tops the first column, Kam jde the second (Figma B-07fd)", async () => {
    await show({ friendship: "none" })

    const block = screen.getByRole("button", { name: "Přidat do přátel" })
    const participant = screen.getByRole("heading", { level: 2, name: "Jako účastník" })
    expect(
      block.compareDocumentPosition(participant) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const organizer = screen.getByRole("heading", { level: 2, name: "Jako organizátor" })
    expect(
      upcoming().compareDocumentPosition(organizer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
