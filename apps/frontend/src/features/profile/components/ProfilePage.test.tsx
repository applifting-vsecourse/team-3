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
    // PO 26. 11.: stars, not „N z 5“ (here five full)
    expect(within(asParticipant).getByRole("img", { name: "5 z 5 hvězd" })).toBeInTheDocument()
    expect(within(asParticipant).queryByText(/z 5$/)).not.toBeInTheDocument()
    expect(within(asParticipant).getByRole("link", { name: "Florbal" })).toHaveAttribute(
      "href",
      "/akce/p1",
    )
    expect(within(asParticipant).getByText("Zobrazeno 1 z 6")).toBeInTheDocument()
  })

  // #370: „Zobrazeno 3 z 7“ had no way to the rest
  const rating = (n: number) => ({
    id: `r${n}`,
    stars: 4,
    comment: null,
    createdAt: new Date("2026-10-30T10:00:00Z"),
    event: { id: `e${n}`, title: `Akce ${n}` },
    author: { id: "org", name: "Petr" },
  })

  it("shows the latest three ratings and the rest on „Zobrazit další“, a toggle", async () => {
    respond({
      ...empty,
      participantRatings: [1, 2, 3, 4, 5].map(rating),
      participantSummary: { average: 4, count: 5 },
    })
    await show()
    const user = userEvent.setup()

    const asParticipant = await screen.findByRole("region", { name: "Jako účastník" })
    expect(within(asParticipant).getAllByRole("listitem")).toHaveLength(3)
    const more = within(asParticipant).getByRole("button", { name: "Zobrazit další (2)" })
    expect(more).toHaveAttribute("aria-expanded", "false")
    expect(more).toHaveClass("h-10")
    await user.click(more)

    expect(within(asParticipant).getAllByRole("listitem")).toHaveLength(5)
    // the same button, so the focus stays where it was (review #395)
    expect(more).toHaveTextContent("Zobrazit méně")
    expect(more).toHaveAttribute("aria-expanded", "true")
    expect(more).toHaveFocus()
    expect(within(asParticipant).queryByText(/Zobrazeno/)).not.toBeInTheDocument()
  })

  it("past the API's limit says how many of all there are, never „všechna“", async () => {
    respond({
      ...empty,
      participantRatings: Array.from({ length: 50 }, (_, i) => rating(i + 1)),
      participantSummary: { average: 4, count: 70 },
    })
    await show()

    const asParticipant = await screen.findByRole("region", { name: "Jako účastník" })
    await userEvent
      .setup()
      .click(within(asParticipant).getByRole("button", { name: "Zobrazit další (47)" }))
    expect(within(asParticipant).getByText("Zobrazeno 50 z 70")).toBeInTheDocument()
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
