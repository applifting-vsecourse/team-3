import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { RateEventPage } from "./RateEventPage"

const { api, toast, FakeHTTPError } = vi.hoisted(() => {
  // An API refusal as ky hands it over: the status, and the body the API sent.
  class FakeHTTPError extends Error {
    response: { status: number }
    data: unknown
    constructor(status: number, data: { code?: string; message: string; participantId?: string }) {
      super(data.message)
      this.response = { status }
      this.data = data
    }
  }
  return {
    api: { get: vi.fn(), put: vi.fn() },
    toast: { success: vi.fn(), error: vi.fn() },
    FakeHTTPError,
  }
})
vi.mock("@/lib/api-client", () => ({
  api,
  HTTPError: FakeHTTPError,
  apiErrorCode: (error: unknown) =>
    error instanceof FakeHTTPError ? (error.data as { code?: string }).code : undefined,
}))
vi.mock("sonner", () => ({ toast }))

const asJson = (body: unknown) => ({ json: () => Promise.resolve(body) })
const refused = (error: Error) => ({ json: () => Promise.reject(error) })

// GET /api/events/e1 for its organizer
const detail = {
  id: "e1",
  title: "Volejbal na Letné",
  startsAt: "2026-10-19T16:00:00.000Z",
  endsAt: "2026-10-19T18:00:00.000Z",
  address: "Sportovní areál Letná, Milady Horákové, Praha 7",
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
}

// GET /api/events/e1/participant-ratings (#66)
const list = {
  participants: [
    { id: "u-jakub", name: "Jakub Král", rating: null, ratingDeleted: false },
    {
      id: "u-lucie",
      name: "Lucie Horáková",
      rating: { stars: 4, comment: "Skvělé nahrávky", updatedAt: "2026-10-20T08:00:00.000Z" },
      ratingDeleted: false,
    },
    { id: "u-eliska", name: "Eliška Malá", rating: null, ratingDeleted: true },
  ],
  ratableUntil: "2026-11-02T22:59:59.999Z",
  refusal: null,
}

let participants: unknown = list

beforeEach(() => {
  participants = list
  api.get.mockReset()
  api.put.mockReset()
  toast.success.mockReset()
  toast.error.mockReset()
  api.get.mockImplementation((path: string) => {
    if (path === "events/e1/rating") {
      return refused(
        new FakeHTTPError(403, { code: "OWN_EVENT", message: "Svou vlastní akci hodnotit nejde." }),
      )
    }
    if (path === "events/e1") return asJson(detail)
    if (path === "events/e1/participant-ratings") {
      return participants instanceof Error ? refused(participants) : asJson(participants)
    }
    throw new Error(`unexpected ${path}`)
  })
})

const renderPage = (
  onSaved = vi.fn().mockResolvedValue(undefined),
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) =>
  renderWithRouter(
    <QueryClientProvider client={client}>
      <RateEventPage
        eventId="e1"
        viewerId="u-petra"
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )

type Saved = { participantId: string; stars: number; comment: string | null }

// PUT as the API does it: each participant's rating replaced, the new state sent back and kept
const serverSaves = () =>
  api.put.mockImplementation((_path: string, { json }: { json: { ratings: Saved[] } }) => {
    const current = participants as typeof list
    participants = {
      ...current,
      participants: current.participants.map((one) => {
        const saved = json.ratings.find((rating) => rating.participantId === one.id)
        return saved
          ? {
              ...one,
              rating: {
                stars: saved.stars,
                comment: saved.comment,
                updatedAt: "2026-10-21T08:00:00.000Z",
              },
            }
          : one
      }),
    }
    return asJson(participants)
  })

const row = (name: string) =>
  screen.getByText(name, { selector: "a, p, span:not(.sr-only)" }).closest("li")!

describe("/akce/:id/hodnoceni for the organizer (Figma D-05, #66)", () => {
  it("after saving and coming back, who got no comment of their own is still „Jako všichni“ (review #322)", async () => {
    const user = userEvent.setup()
    participants = {
      ...list,
      participants: [
        { id: "u-jakub", name: "Jakub Král", rating: null, ratingDeleted: false },
        { id: "u-martin", name: "Martin Černý", rating: null, ratingDeleted: false },
        list.participants[1],
      ],
    }
    serverSaves()
    const first = await renderPage()
    await screen.findByText("Účastníci (3)")

    await user.type(screen.getByLabelText("Komentář pro všechny (nepovinné)"), "Díky za hru!")
    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))
    await screen.findByText("Uložit hodnocení")
    expect(toast.success).toHaveBeenCalled()

    // after saving: the common comment isn't theirs
    for (const name of ["Jakub Král", "Martin Černý"]) {
      expect(within(row(name)).getByText("Jako všichni")).toBeInTheDocument()
      expect(within(row(name)).queryByRole("textbox")).not.toBeInTheDocument()
    }
    expect(
      within(row("Lucie Horáková")).getByText("Uloženo: 4 hvězdy a vlastní komentář"),
    ).toBeInTheDocument()

    // coming back: „Všem stejně“ is read back from what was saved
    first.unmount()
    await renderPage()
    await screen.findByText("Účastníci (3)")
    expect(screen.getByLabelText("Komentář pro všechny (nepovinné)")).toHaveValue("Díky za hru!")
    for (const name of ["Jakub Král", "Martin Černý"]) {
      expect(within(row(name)).getByText("Jako všichni")).toBeInTheDocument()
    }

    // a new common comment reaches them again, not Lucie with her own
    const comment = screen.getByLabelText("Komentář pro všechny (nepovinné)")
    await user.clear(comment)
    await user.type(comment, "Příště zase!")
    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))
    expect(api.put).toHaveBeenLastCalledWith("events/e1/participant-ratings", {
      json: {
        ratings: [
          { participantId: "u-jakub", stars: 5, comment: "Příště zase!" },
          { participantId: "u-martin", stars: 5, comment: "Příště zase!" },
          { participantId: "u-lucie", stars: 4, comment: "Skvělé nahrávky" },
        ],
      },
    })
  })

  it("403 OWN_EVENT leads to the participants: band, „Všem stejně“, one row each", async () => {
    await renderPage()

    expect(
      await screen.findByRole("heading", { level: 1, name: "Ohodnoť účastníky" }),
    ).toBeInTheDocument()
    expect(await screen.findByText("Účastníci (3)")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Volejbal na Letné · Po 19. 10. · Sportovní areál Letná, Praha 7 · sešlo se 5 lidí",
      ),
    ).toBeInTheDocument()
    // „Všem stejně“ starts at 5 stars
    const common = screen.getByRole("radiogroup", { name: "Všem stejně" })
    expect(within(common).getByRole("radio", { name: "5 z 5 hvězd" })).toBeChecked()
    expect(screen.getByLabelText("Komentář pro všechny (nepovinné)")).toHaveValue("")

    expect(within(row("Jakub Král")).getByText("Jako všichni")).toBeInTheDocument()
    expect(
      within(row("Lucie Horáková")).getByText("Uloženo: 4 hvězdy a vlastní komentář"),
    ).toBeInTheDocument()
    expect(within(row("Lucie Horáková")).getByRole("textbox")).toHaveValue("Skvělé nahrávky")
    // a rating a superadmin deleted can't be given again
    expect(within(row("Eliška Malá")).getByText("Hodnocení odstranil správce")).toBeInTheDocument()
    expect(within(row("Eliška Malá")).queryByRole("radiogroup")).not.toBeInTheDocument()

    expect(
      screen.getByText(
        /^Hodnotit jde 14 dní po akci, tedy do .+, a do té doby hodnocení změníš\. /,
      ),
    ).toBeInTheDocument()
    // the participant's side isn't there
    expect(screen.queryByText("Jak se akce povedla?")).not.toBeInTheDocument()
    expect(screen.queryByText("Svou akci nehodnotíš")).not.toBeInTheDocument()
  })

  it("saves everyone at once: the common stars and comment, and each one's own", async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn().mockResolvedValue(undefined)
    serverSaves()
    await renderPage(onSaved)
    await screen.findByText("Účastníci (3)")

    const common = screen.getByRole("radiogroup", { name: "Všem stejně" })
    await user.click(within(common).getByRole("radio", { name: "4 z 5 hvězd" }))
    await user.type(screen.getByLabelText("Komentář pro všechny (nepovinné)"), "Díky za hru!")
    // Jakub follows the common rating; his stars show it
    const jakub = row("Jakub Král")
    expect(within(jakub).getByRole("radio", { name: "4 z 5 hvězd" })).toBeChecked()
    await user.click(within(jakub).getByRole("radio", { name: "3 z 5 hvězd" }))
    expect(within(jakub).getByText("Upraveno: 3 hvězdy")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))

    expect(api.put).toHaveBeenCalledWith("events/e1/participant-ratings", {
      json: {
        ratings: [
          { participantId: "u-jakub", stars: 3, comment: "Díky za hru!" },
          { participantId: "u-lucie", stars: 4, comment: "Skvělé nahrávky" },
        ],
      },
    })
    expect(await screen.findByText("Uloženo: 4 hvězdy a vlastní komentář")).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith("Hodnocení účastníků je uložené")
    expect(onSaved).toHaveBeenCalled()
  })

  it("„Použít pro všechny“ puts everyone back to the common rating", async () => {
    const user = userEvent.setup()
    api.put.mockReturnValue(asJson(list))
    await renderPage()
    await screen.findByText("Účastníci (3)")

    await user.click(screen.getByRole("button", { name: "Použít pro všechny" }))
    expect(within(row("Lucie Horáková")).getByText("Jako všichni")).toBeInTheDocument()
    expect(within(row("Lucie Horáková")).queryByRole("textbox")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))
    expect(api.put).toHaveBeenCalledWith("events/e1/participant-ratings", {
      json: {
        ratings: [
          { participantId: "u-jakub", stars: 5, comment: null },
          { participantId: "u-lucie", stars: 5, comment: null },
        ],
      },
    })
  })

  it("„Přidat vlastní komentář“ opens one for that participant", async () => {
    const user = userEvent.setup()
    api.put.mockReturnValue(asJson(list))
    await renderPage()
    await screen.findByText("Účastníci (3)")

    const jakub = row("Jakub Král")
    await user.click(within(jakub).getByRole("button", { name: "Přidat vlastní komentář" }))
    await user.type(within(jakub).getByLabelText("Vlastní komentář (nepovinné)"), "Super smeče")
    expect(within(jakub).getByText("Upraveno: 5 hvězd a vlastní komentář")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))
    expect(api.put).toHaveBeenCalledWith("events/e1/participant-ratings", {
      json: {
        ratings: [
          { participantId: "u-jakub", stars: 5, comment: "Super smeče" },
          { participantId: "u-lucie", stars: 4, comment: "Skvělé nahrávky" },
        ],
      },
    })
  })

  it("a refusal about one participant: they are left out, the rest can be saved (review #322)", async () => {
    const user = userEvent.setup()
    api.put.mockReturnValueOnce(
      refused(
        new FakeHTTPError(409, {
          code: "NOT_APPROVED",
          message: "Jakub Král už na akci není.",
          participantId: "u-jakub",
        }),
      ),
    )
    await renderPage()
    await screen.findByText("Účastníci (3)")

    await user.click(within(row("Lucie Horáková")).getByRole("radio", { name: "2 z 5 hvězd" }))
    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))

    const jakub = row("Jakub Král")
    expect(await within(jakub).findByRole("alert")).toHaveTextContent("Jakub Král už na akci není.")
    expect(within(jakub).getByText("Neuloží se")).toBeInTheDocument()
    // no stars left to carry a stale aria-invalid
    expect(within(jakub).queryByRole("radiogroup")).not.toBeInTheDocument()
    // Lucie's edit stays
    expect(within(row("Lucie Horáková")).getByText(/^Upraveno: 2 hvězdy/)).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith("Jakub Král už na akci není.")

    // the next save goes without him, and goes through
    serverSaves()
    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))
    expect(api.put).toHaveBeenLastCalledWith("events/e1/participant-ratings", {
      json: { ratings: [{ participantId: "u-lucie", stars: 2, comment: "Skvělé nahrávky" }] },
    })
    expect(await screen.findByText("Uloženo: 2 hvězdy a vlastní komentář")).toBeInTheDocument()
  })

  it("the list read again after a refusal: who isn't on it goes, the edits stay", async () => {
    const user = userEvent.setup()
    api.put.mockImplementationOnce(() => {
      // meanwhile Jakub was removed from the event
      participants = { ...list, participants: list.participants.slice(1) }
      return refused(
        new FakeHTTPError(409, {
          code: "NOT_APPROVED",
          message: "Jakub Král už na akci není.",
          participantId: "u-jakub",
        }),
      )
    })
    await renderPage()
    await screen.findByText("Účastníci (3)")

    await user.click(within(row("Lucie Horáková")).getByRole("radio", { name: "2 z 5 hvězd" }))
    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))

    expect(await screen.findByText("Účastníci (2)")).toBeInTheDocument()
    expect(screen.queryByText("Jakub Král")).not.toBeInTheDocument()
    expect(within(row("Lucie Horáková")).getByText(/^Upraveno: 2 hvězdy/)).toBeInTheDocument()
  })

  it("another tab saved: the untouched rows show it, the edited ones stay (review #322)", async () => {
    const user = userEvent.setup()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await renderPage(undefined, client)
    await screen.findByText("Účastníci (3)")

    await user.click(within(row("Jakub Král")).getByRole("radio", { name: "3 z 5 hvězd" }))
    // tab B saved Lucie anew; this tab reads the list again (focus)
    participants = {
      ...list,
      participants: list.participants.map((one) =>
        one.id === "u-lucie"
          ? {
              ...one,
              rating: { stars: 2, comment: "Z jiného tabu", updatedAt: "2026-10-22T08:00:00.000Z" },
            }
          : one,
      ),
    }
    await act(() => client.invalidateQueries())

    const lucie = row("Lucie Horáková")
    expect(
      await within(lucie).findByText("Uloženo: 2 hvězdy a vlastní komentář"),
    ).toBeInTheDocument()
    expect(within(lucie).getByRole("textbox")).toHaveValue("Z jiného tabu")
    expect(within(row("Jakub Král")).getByText("Upraveno: 3 hvězdy")).toBeInTheDocument()
  })

  it("a row's own comment error goes once the comment is fixed", async () => {
    const user = userEvent.setup()
    await renderPage()
    await screen.findByText("Účastníci (3)")

    const comment = within(row("Lucie Horáková")).getByLabelText("Vlastní komentář (nepovinné)")
    await user.click(comment)
    await user.paste("a".repeat(501))
    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))
    expect(comment).toHaveAttribute("aria-invalid", "true")

    await user.clear(comment)
    await user.type(comment, "Kratší")
    expect(comment).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByText("Komentář může mít nejvýš 500 znaků")).not.toBeInTheDocument()
  })

  it("saved, but the answer can't be read: no failure reported, the list is read again (review #322)", async () => {
    const user = userEvent.setup()
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    api.put.mockReturnValue(asJson({ unexpected: true }))
    await renderPage()
    await screen.findByText("Účastníci (3)")
    const reads = () =>
      api.get.mock.calls.filter(([path]) => path === "events/e1/participant-ratings").length
    const before = reads()

    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))

    expect(await screen.findByText("Uložit hodnocení")).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith("Hodnocení účastníků je uložené")
    expect(toast.error).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(reads()).toBeGreaterThan(before))
    error.mockRestore()
  })

  it("a comment over 500 characters isn't sent", async () => {
    const user = userEvent.setup()
    await renderPage()
    await screen.findByText("Účastníci (3)")

    const comment = screen.getByLabelText("Komentář pro všechny (nepovinné)")
    await user.click(comment)
    await user.paste("a".repeat(501))
    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))

    expect(screen.getByText("Komentář může mít nejvýš 500 znaků")).toBeInTheDocument()
    expect(comment).toHaveAttribute("aria-invalid", "true")
    expect(api.put).not.toHaveBeenCalled()
  })

  it.each([
    ["EVENT_NOT_HELD", "Akce se nekonala"],
    ["RATING_WINDOW_CLOSED", "Hodnotit už nejde"],
    ["EVENT_NOT_ENDED", "Hodnotit půjde, až akce skončí"],
  ])("%s: says why instead of the form", async (refusal, title) => {
    participants = { ...list, refusal }
    await renderPage()

    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Uložit hodnocení" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Zpět na správu akce" })).toHaveAttribute(
      "href",
      "/akce/e1/sprava",
    )
  })

  it("before the event ends, no past event's card: it would say it took place (review #322)", async () => {
    participants = { ...list, refusal: "EVENT_NOT_ENDED" }
    await renderPage()

    expect(await screen.findByText("Hodnotit půjde, až akce skončí")).toBeInTheDocument()
    expect(screen.queryByText("Proběhlo")).not.toBeInTheDocument()
    expect(screen.queryByText(/^Sešlo se/)).not.toBeInTheDocument()
  })

  it("a participant's own comment over 500 characters is marked at that comment", async () => {
    const user = userEvent.setup()
    await renderPage()
    await screen.findByText("Účastníci (3)")

    const comment = within(row("Lucie Horáková")).getByLabelText("Vlastní komentář (nepovinné)")
    await user.clear(comment)
    await user.click(comment)
    await user.paste("a".repeat(501))
    await user.click(screen.getByRole("button", { name: "Uložit hodnocení" }))

    expect(comment).toHaveAttribute("aria-invalid", "true")
    expect(comment).toHaveAccessibleDescription("Komentář může mít nejvýš 500 znaků")
    expect(api.put).not.toHaveBeenCalled()
  })

  it("nobody else came: nothing to rate", async () => {
    participants = { ...list, participants: [] }
    await renderPage()

    expect(await screen.findByText("Není koho hodnotit")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Uložit hodnocení" })).not.toBeInTheDocument()
  })
})
