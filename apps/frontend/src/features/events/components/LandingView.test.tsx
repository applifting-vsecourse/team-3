import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { homeKeys } from "@/features/events/api/homeQueryOptions"
import { LandingView } from "@/features/events/components/LandingView"
import { anEvent } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

// what the API sends: dates as ISO strings
const asJson = (body: unknown) =>
  ({ json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) }) as never

const localities = [
  { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50.08, lng: 14.44 },
  {
    id: "l-praha-3",
    slug: "praha-3",
    name: "Praha 3",
    parentId: "l-praha",
    lat: 50.08,
    lng: 14.46,
  },
]

const events = (prefix: string, count = 3): PublicEvent[] =>
  Array.from({ length: count }, (_, i) =>
    // ids without diacritics, as the API's
    anEvent({
      id: `${prefix.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}${i + 1}`,
      title: `${prefix} ${i + 1}`,
    }),
  )

const highlight = anEvent({
  id: "h1",
  title: "Volejbal na Pankráci",
  // Thursday, four days after the test's „now“
  startsAt: new Date("2026-11-12T17:00:00.000Z"),
  approvedCount: 5,
  minParticipants: 6,
  maxParticipants: 10,
  missingToMin: 1,
  freeSpots: 5,
})

const group = {
  id: "g1",
  name: "Florbal Podvinný mlýn",
  type: "public",
  activity: {
    id: "a-florbal",
    slug: "florbal",
    name: "Florbal",
    category: { id: "c-tym", slug: "tymove-sporty", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l-praha-9", slug: "praha-9", name: "Praha 9" },
  memberCount: 8,
}

type Section = { key: string; events?: PublicEvent[]; groups?: unknown[] }
type HomeBody = { locality: unknown; sections: Section[] }

const visitorHome: HomeBody = {
  locality: null,
  sections: [
    { key: "highlight", events: [highlight] },
    { key: "missing", events: events("Chybí") },
    { key: "popular", events: events("Zájem") },
    { key: "wellRated", events: events("Hodnocené", 2) },
    { key: "groups", groups: [group] },
  ],
}

const signedInHome: HomeBody = {
  locality: { id: "l-praha-3", slug: "praha-3", name: "Praha 3", source: "profile" },
  sections: [
    { key: "highlight", events: [highlight] },
    { key: "missing", events: events("Chybí") },
    { key: "interests", events: events("Zájmy", 2) },
    { key: "nearby", events: events("Blízko", 1) },
  ],
}

let home: HomeBody | Error

const mockApi = () =>
  get.mockImplementation(((path: string) => {
    if (path === "localities") return asJson(localities)
    if (path === "home") {
      const answer = home
      if (answer instanceof Error) return { json: () => Promise.reject(answer) } as never
      return asJson(answer)
    }
    throw new Error(`unexpected GET ${path}`)
  }) as never)

type RenderOptions = {
  session?: "visitor" | "signedIn" | "loading"
  localitySlug?: string
}

let queryClient: QueryClient

const renderLanding = ({ session = "visitor", localitySlug }: RenderOptions = {}) => {
  const isSignedIn = session === "loading" ? undefined : session === "signedIn"
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <LandingView
        isSignedIn={isSignedIn}
        viewerId={isSignedIn ? "u-jakub" : null}
        localitySlug={localitySlug}
        renderGroups={(groups) => <p>{groups.length} skupin z API</p>}
        // Sunday 8. 11. 2026, so „Tento víkend“ is just today
        now={new Date("2026-11-08T10:00:00.000Z")}
      />
    </QueryClientProvider>,
  )
}

const homeRequests = () => get.mock.calls.filter(([path]) => path === "home")

describe("LandingView", () => {
  beforeEach(() => {
    get.mockReset()
    home = visitorHome
    mockApi()
  })

  describe("signed out (Figma A-01, A-01d)", () => {
    it("welcomes a visitor and offers to sign up", async () => {
      await renderLanding()

      expect(
        screen.getByRole("heading", { level: 1, name: "Někde chybí jeden do party. Třeba ty." }),
      ).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Zaregistrovat se" })).toHaveAttribute(
        "href",
        "/signup",
      )
    })

    it("shows the sections the API sent, in its order, with „Jak to funguje“ after „Tady chybíš“", async () => {
      await renderLanding()

      await screen.findByRole("heading", { name: "Tady chybíš" })
      const headings = screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
      expect(headings).toEqual([
        "Volejbal na Pankráci",
        "Tady chybíš",
        "Jak to funguje",
        "O tyhle akce je zájem",
        "Od dobře hodnocených organizátorů",
      ])
    })

    it("each section lists its events as links to their detail", async () => {
      await renderLanding()

      const section = (await screen.findByRole("heading", { name: "Tady chybíš" })).closest(
        "section",
      )!
      const links = within(section).getAllByRole("link", { name: /^Chybí \d$/ })
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "/akce/Chybi1",
        "/akce/Chybi2",
        "/akce/Chybi3",
      ])
      // „Zobrazit všechny“ opens /akce with the same pick, for all of Czechia (no locality)
      expect(within(section).getAllByRole("link", { name: /Zobrazit všechny/ })[0]).toHaveAttribute(
        "href",
        "/akce?lokalita=cele-cesko&obsazenost=chybi",
      )
    })

    it("a section the API left out is not on the page, not even its heading", async () => {
      await renderLanding()

      await screen.findByRole("heading", { name: "Tady chybíš" })
      expect(screen.queryByRole("heading", { name: "Tento víkend" })).not.toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Kousek od tebe" })).not.toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Pro tebe" })).not.toBeInTheDocument()
    })

    it("the panel „Teď chybí jeden“ shows the highlighted event with numbers", async () => {
      await renderLanding()

      const title = await screen.findByRole("link", { name: "Volejbal na Pankráci" })
      const panel = title.closest("article")!
      expect(within(panel).getByText("Teď chybí jeden · za 4 dny")).toBeInTheDocument()
      expect(
        within(panel).getByText("5 z 10 už jde, do minima chybí 1. Přijď a akce se koná."),
      ).toBeInTheDocument()
    })

    it("hands the groups to the groups feature", async () => {
      await renderLanding()

      expect(await screen.findByText("1 skupin z API")).toBeInTheDocument()
    })

    it("without a locality lets the API decide; with ?lokalita= asks for its id", async () => {
      await renderLanding()
      await screen.findByRole("heading", { name: "Tady chybíš" })
      expect(homeRequests().at(-1)?.[1]).toEqual({ searchParams: undefined })

      get.mockClear()
      await renderLanding({ localitySlug: "praha-3" })
      await waitFor(() => expect(homeRequests()).toHaveLength(1))
      expect(homeRequests()[0]?.[1]).toEqual({ searchParams: { localityId: "l-praha-3" } })
    })
  })

  describe("signed in (Figma A-01p, A-01pd)", () => {
    beforeEach(() => {
      home = signedInHome
    })

    it("has the quick picks „Pro tebe“ as tabs, only for the sections that came, and no visitor parts", async () => {
      await renderLanding({ session: "signedIn" })

      expect(
        screen.getByRole("heading", { level: 1, name: "Tady se na tebe čeká." }),
      ).toBeInTheDocument()
      await screen.findByRole("heading", { name: "Pro tebe" })
      expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "Tady chybíš 3",
        "Podle tvých zájmů 2",
        "Kousek od tebe 1",
      ])
      expect(screen.queryByRole("heading", { name: "Jak to funguje" })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: "Zaregistrovat se" })).not.toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Moje akce" })).toHaveAttribute("href", "/moje/akce")
    })

    it("a tab shows its own events", async () => {
      const user = userEvent.setup()
      await renderLanding({ session: "signedIn" })

      const panel = await screen.findByRole("tabpanel")
      expect(within(panel).getAllByRole("link", { name: /^Chybí \d$/ })).toHaveLength(3)
      expect(within(panel).getByText(/v okolí lokality Praha 3/)).toBeInTheDocument()

      await user.click(screen.getByRole("tab", { name: /Podle tvých zájmů/ }))

      const interests = screen.getByRole("tabpanel")
      expect(within(interests).getAllByRole("link", { name: /^Zájmy \d$/ })).toHaveLength(2)
      expect(within(interests).queryByRole("link", { name: /^Chybí/ })).not.toBeInTheDocument()
    })

    it("„Zobrazit všechny“ of a district opens /akce for its whole city", async () => {
      await renderLanding({ session: "signedIn" })

      const panel = await screen.findByRole("tabpanel")
      await waitFor(() =>
        expect(within(panel).getAllByRole("link", { name: /Zobrazit všechny/ })[0]).toHaveAttribute(
          "href",
          "/akce?lokalita=praha&obsazenost=chybi",
        ),
      )
    })
  })

  it("while the session loads, no title shows that could swap out and nothing is fetched", async () => {
    await renderLanding({ session: "loading" })

    expect(screen.getByRole("heading", { level: 1 }).firstElementChild).toHaveClass("invisible")
    expect(homeRequests()).toHaveLength(0)
  })

  it("loading: the panel and a section keep their place", async () => {
    get.mockImplementation(((path: string) =>
      path === "home"
        ? // never answers
          ({ json: () => new Promise(() => undefined) } as never)
        : asJson(localities)) as never)
    await renderLanding()

    expect(screen.getAllByLabelText("Načítám akce")).toHaveLength(2)
  })

  describe("the panel without an event (Figma A-01 · Panel – bez akce)", () => {
    it("events elsewhere, none missing people: the events with free places", async () => {
      home = { locality: null, sections: [{ key: "popular", events: events("Zájem") }] }
      await renderLanding()

      expect(
        await screen.findByRole("heading", { name: "Všechny party jsou kompletní" }),
      ).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Akce s volnými místy" })).toHaveAttribute(
        "href",
        "/akce?lokalita=cele-cesko&obsazenost=volna",
      )
    })

    it("signed in, speaks only of the events one can join (review #263)", async () => {
      home = { locality: null, sections: [{ key: "weekend", events: events("Víkend") }] }
      await renderLanding({ session: "signedIn" })

      expect(
        await screen.findByText(/Akce v okolí, kam se můžeš přidat, mají svoje minimum\./),
      ).toBeInTheDocument()
    })

    it.each([
      [false, "Zaregistrovat se", "/signup"],
      [true, "Založit akci", "/akce/nova"],
    ])("nothing upcoming (signed in: %s): be the first — „%s“", async (isSignedIn, label, href) => {
      home = { locality: null, sections: [] }
      await renderLanding({ session: isSignedIn ? "signedIn" : "visitor" })

      const title = await screen.findByRole("heading", { name: "Buď první" })
      const panel = title.parentElement!
      expect(within(panel).getByRole("link", { name: label })).toHaveAttribute("href", href)
      // no section headings beyond the page's own blocks
      expect(screen.queryByRole("heading", { name: "Tady chybíš" })).not.toBeInTheDocument()
    })
  })

  it("a failed refetch keeps the loaded panel and sections (review #263)", async () => {
    await renderLanding()
    await screen.findByRole("heading", { name: "Tady chybíš" })

    home = new Error("offline")
    // as on window focus or after a mutation's invalidation
    await queryClient.refetchQueries()

    expect(queryClient.getQueryState(homeKeys.home(null, null))?.status).toBe("error")
    expect(screen.getByRole("link", { name: "Volejbal na Pankráci" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Tady chybíš" })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("an error says so in the panel's place and retries", async () => {
    home = new Error("offline")
    const user = userEvent.setup()
    await renderLanding()

    expect(await screen.findByRole("alert")).toHaveTextContent("Akce se nepodařilo načíst")

    home = visitorHome
    await user.click(screen.getByRole("button", { name: "Zkusit znovu" }))

    expect(await screen.findByRole("heading", { name: "Tady chybíš" })).toBeInTheDocument()
  })
})
