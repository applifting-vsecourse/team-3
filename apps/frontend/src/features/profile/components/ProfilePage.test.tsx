import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type {
  ProfileEvent,
  ProfileOverviewData,
  SelfProfile,
} from "@/features/profile/api/profileSchemas"

import { ProfilePage } from "./ProfilePage"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const profile: SelfProfile = {
  id: "owner",
  name: "Jana Nová",
  email: "jana@example.com",
  emailVerified: true,
  hasPassword: true,
  homeLocality: { id: "p7", slug: "praha-7", name: "Praha 7", parentId: null, lat: 50, lng: 14 },
  interests: [{ id: "running", name: "Běh" }],
}
const anEvent = (overrides: Partial<ProfileEvent>): ProfileEvent => ({
  id: "e1",
  title: "Florbal",
  startsAt: new Date("2026-11-20T17:00:00Z"),
  endsAt: null,
  status: "published",
  localityName: "Praha 7",
  participation: null,
  ...overrides,
})
const empty: ProfileOverviewData = {
  organizing: [],
  organizingTotal: 0,
  upcoming: [],
  upcomingTotal: 0,
  past: [],
  pastTotal: 0,
  participantRatings: [],
  organizerRatings: [],
  participantSummary: { average: null, count: 0 },
  organizerSummary: { average: null, count: 0 },
}

// what the API sends: dates as ISO strings
const asJson = (body: unknown) => ({
  json: () => Promise.resolve(JSON.parse(JSON.stringify(body))),
})
const respond = (overview: ProfileOverviewData | Error) =>
  api.get.mockImplementation((path: string) => {
    if (path === "me/profile") return asJson(profile)
    if (path === "me/profile/overview") {
      return overview instanceof Error ? { json: () => Promise.reject(overview) } : asJson(overview)
    }
    throw new Error(`unexpected ${path}`)
  })

const show = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProfilePage
        viewerId="owner"
        groupsContent={
          // the groups feature's own section, with its own tests (ProfileGroups.test.tsx)
          <section aria-label="Moje skupiny">
            <h2>Moje skupiny</h2>
          </section>
        }
      />
    </QueryClientProvider>,
  )
const section = (name: string) => screen.getByRole("region", { name })

beforeEach(() => {
  api.get.mockReset()
})

describe("/profil overview (#178, Figma B-05)", () => {
  it("shows who I am, the way to editing and the sections in the Figma order", async () => {
    respond({ ...empty, participantSummary: { average: 4.5, count: 6 } })
    await show()

    expect(await screen.findByRole("heading", { level: 1, name: "Jana Nová" })).toBeInTheDocument()
    expect(screen.getByText("Praha 7 · ★ 4,5 (6 hodnocení)")).toBeInTheDocument()
    expect(within(screen.getByRole("list", { name: "Zájmy" })).getByText("Běh")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Upravit profil" })).toHaveAttribute(
      "href",
      "/profil/upravit",
    )
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Kam jdu",
      "Pořádám",
      "Proběhlé",
      "Moje skupiny",
      "Hodnocení",
    ])
  })

  it("says in each empty section what would be there, and that there is no rating yet", async () => {
    respond(empty)
    await show()

    await screen.findByRole("heading", { level: 1, name: "Jana Nová" })
    expect(screen.getByText("Praha 7 · zatím bez hodnocení")).toBeInTheDocument()
    expect(within(section("Kam jdu")).getByText("Zatím nejdeš na žádnou akci.")).toBeInTheDocument()
    expect(within(section("Kam jdu")).getByRole("link", { name: "Projít akce" })).toHaveAttribute(
      "href",
      "/akce",
    )
    expect(within(section("Pořádám")).getByText("Zatím žádnou akci nepořádáš.")).toBeInTheDocument()
    expect(
      within(section("Proběhlé")).getByText(
        "Tady uvidíš proběhlé akce, na které máš schválenou účast.",
      ),
    ).toBeInTheDocument()
    expect(within(section("Jako účastník")).getByText("zatím bez hodnocení")).toBeInTheDocument()
    expect(within(section("Jako organizátor")).getByText("zatím bez hodnocení")).toBeInTheDocument()
    // nothing to see in full
    expect(screen.queryByRole("link", { name: "Všechny v Moje akce" })).not.toBeInTheDocument()
  })

  it("marks a waiting request and a cancelled event, and leads to the rest in Moje akce", async () => {
    respond({
      ...empty,
      upcoming: [
        anEvent({ id: "e1", title: "Výlet na Zbraslav", participation: "pending" }),
        anEvent({ id: "e2", title: "Volejbal", participation: "approved" }),
      ],
      upcomingTotal: 5,
      organizing: [anEvent({ id: "e3", title: "Deskovky", status: "cancelled" })],
      organizingTotal: 1,
    })
    await show()

    const going = await screen.findByRole("region", { name: "Kam jdu" })
    const [trip, volleyball] = within(going).getAllByRole("listitem")
    expect(within(trip!).getByRole("link", { name: "Výlet na Zbraslav" })).toHaveAttribute(
      "href",
      "/akce/e1",
    )
    expect(within(trip!).getByText("Čeká")).toBeInTheDocument()
    expect(within(volleyball!).getByText("Jdu")).toBeInTheDocument()
    expect(within(going).getByRole("link", { name: "Všechny v Moje akce" })).toHaveAttribute(
      "href",
      "/moje-akce",
    )

    const organizing = section("Pořádám")
    expect(within(organizing).getByText("Zrušeno")).toBeInTheDocument()
    expect(within(organizing).getByRole("link", { name: "Všechny v Moje akce" })).toHaveAttribute(
      "href",
      "/moje-akce?tab=poradam",
    )
  })

  it("says how many are left out where no page lists them all yet", async () => {
    respond({
      ...empty,
      past: [
        anEvent({ id: "p1", participation: "approved" }),
        anEvent({ id: "p2", participation: "approved" }),
        anEvent({ id: "p3", participation: "approved" }),
      ],
      pastTotal: 12,
      participantRatings: [
        {
          id: "r1",
          stars: 5,
          comment: "Spolehlivě dorazí.",
          createdAt: new Date("2026-10-30T10:00:00Z"),
          event: { id: "p1", title: "Florbal" },
          author: { id: "org", name: "Petr" },
        },
      ],
      participantSummary: { average: 4.5, count: 6 },
    })
    await show()

    const past = await screen.findByRole("region", { name: "Proběhlé" })
    expect(within(past).getByText("Zobrazeno 3 z 12")).toBeInTheDocument()
    // past places are all approved: no „Jdu“ on them
    expect(within(past).queryByText("Jdu")).not.toBeInTheDocument()
    const asParticipant = section("Jako účastník")
    expect(within(asParticipant).getByText("★ 4,5 (6 hodnocení)")).toBeInTheDocument()
    expect(within(asParticipant).getByText("Spolehlivě dorazí.")).toBeInTheDocument()
    expect(within(asParticipant).getByText("Zobrazeno 1 z 6")).toBeInTheDocument()
  })

  it("explains a failed load and loads again on retry", async () => {
    respond(new Error("offline"))
    await show()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Údaje se nepodařilo načíst.")
    respond(empty)
    await userEvent.setup().click(within(alert).getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByRole("heading", { level: 1, name: "Jana Nová" })).toBeInTheDocument()
  })
})
