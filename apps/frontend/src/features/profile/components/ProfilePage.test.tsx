import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { ProfileOverviewData, SelfProfile } from "@/features/profile/api/profileSchemas"

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
const empty: ProfileOverviewData = {
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
      <ProfilePage viewerId="owner" />
    </QueryClientProvider>,
  )
const section = (name: string) => screen.getByRole("region", { name })

beforeEach(() => {
  api.get.mockReset()
})

describe("/profil overview (#178, #367, Figma B-05)", () => {
  it("shows who I am, the way to editing and my ratings — what I do is in Moje (#367)", async () => {
    respond({ ...empty, participantSummary: { average: 4.5, count: 6 } })
    await show()

    const name = await screen.findByRole("heading", { level: 1, name: "Jana Nová" })
    // who I am sits in the dark band (DESIGN.md › Layout); the avatar is decoration
    expect(name.closest(".on-hero")).not.toBeNull()
    expect(screen.getByText("JN").closest("[aria-hidden='true']")).not.toBeNull()
    expect(screen.getByText("Praha 7 · ★ 4,5 (6 hodnocení)")).toBeInTheDocument()
    expect(within(screen.getByRole("list", { name: "Zájmy" })).getByText("Běh")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Upravit profil" })).toHaveAttribute(
      "href",
      "/profil/upravit",
    )
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Moje hodnocení",
    ])
    // one highlighted keyword per section heading (DESIGN.md › Type)
    expect(
      screen.getByRole("heading", { level: 2 }).querySelector(".highlight-keyword")?.textContent,
    ).toBe("hodnocení")
    // only the profile and the ratings are asked for: no events, no groups
    expect(api.get.mock.calls.map(([path]) => String(path)).sort()).toEqual([
      "me/profile",
      "me/profile/overview",
    ])
  })

  it("the people I know come first, before my ratings (#307)", async () => {
    respond(empty)
    await renderWithRouter(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfilePage
          viewerId="owner"
          peopleContent={
            <section aria-label="Lidé, které znám">
              <h2>Lidé, které znám</h2>
            </section>
          }
        />
      </QueryClientProvider>,
    )

    await screen.findByRole("heading", { level: 1, name: "Jana Nová" })
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Lidé, které znám",
      "Moje hodnocení",
    ])
  })

  it("says there is no rating yet", async () => {
    respond(empty)
    await show()

    await screen.findByRole("heading", { level: 1, name: "Jana Nová" })
    expect(screen.getByText("Praha 7 · zatím bez hodnocení")).toBeInTheDocument()
    expect(within(section("Jako účastník")).getByText("zatím bez hodnocení")).toBeInTheDocument()
    expect(within(section("Jako organizátor")).getByText("zatím bez hodnocení")).toBeInTheDocument()
  })

  it("shows the latest ratings and how many are left out", async () => {
    respond({
      ...empty,
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

    const asParticipant = await screen.findByRole("region", { name: "Jako účastník" })
    expect(within(asParticipant).getByText("★ 4,5 (6 hodnocení)")).toBeInTheDocument()
    expect(within(asParticipant).getByText("Spolehlivě dorazí.")).toBeInTheDocument()
    expect(within(asParticipant).getByRole("link", { name: "Florbal" })).toHaveAttribute(
      "href",
      "/akce/p1",
    )
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
