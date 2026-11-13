import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { RateEventPage } from "./RateEventPage"

const { api, toast, FakeHTTPError } = vi.hoisted(() => {
  // An API refusal as ky hands it over: the status, and the body the API sent.
  class FakeHTTPError extends Error {
    response: { status: number }
    data: unknown
    constructor(status: number, data: { code?: string; message: string }) {
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

// what GET /api/events/:id/rating sends (#66)
const event = {
  id: "e1",
  title: "Volejbal na Letné",
  startsAt: "2026-10-19T16:00:00.000Z",
  endsAt: "2026-10-19T18:00:00.000Z",
  address: "Sportovní areál Letná, Milady Horákové, Praha 7",
  status: "published",
  activity: {
    id: "a1",
    slug: "volejbal",
    name: "Volejbal",
    category: { id: "c1", slug: "tymove-sporty", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l1", slug: "praha-7", name: "Praha 7" },
  organizer: { id: "u-petra", name: "Petra Nováková" },
  group: null,
  approvedCount: 5,
}
const fresh = {
  event,
  rating: null,
  ratableUntil: "2026-11-02T18:00:00.000Z",
  refusal: null,
}
const given = {
  ...fresh,
  rating: {
    eventStars: 5,
    organizerStars: 4,
    comment: "Skvělá parta, příště zase.",
    updatedAt: "2026-10-20T08:00:00.000Z",
  },
}

let answer: unknown = fresh

beforeEach(() => {
  answer = fresh
  api.get.mockReset()
  api.put.mockReset()
  toast.success.mockReset()
  toast.error.mockReset()
  api.get.mockImplementation((path: string) => {
    if (path !== "events/e1/rating") throw new Error(`unexpected ${path}`)
    const current = answer
    if (current instanceof Error) return { json: () => Promise.reject(current) }
    return asJson(current)
  })
})

const renderPage = (onSaved = vi.fn().mockResolvedValue(undefined)) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RateEventPage
        eventId="e1"
        viewerId="u-jakub"
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )

describe("/akce/:id/hodnoceni for a participant (Figma C-03, #66)", () => {
  it("shows the band, the event's card, the two questions and the comment", async () => {
    await renderPage()

    expect(
      screen.getByRole("heading", { level: 1, name: "Ohodnoť akci" }).closest(".on-hero"),
    ).not.toBeNull()
    expect(
      await screen.findByText(
        "Volejbal na Letné · Po 19. 10. · Sportovní areál Letná, Praha 7 · sešlo se 5 lidí",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Volejbal na Letné" })).toBeInTheDocument()
    expect(screen.getByRole("radiogroup", { name: "Jak se akce povedla?" })).toBeInTheDocument()
    expect(
      screen.getByRole("radiogroup", { name: "Jak hodnotíš organizátora?" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Petra Nováková · organizátor")).toBeInTheDocument()
    expect(screen.getByLabelText("Komentář (nepovinné)")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Odeslat hodnocení" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Hodnotit jde do 14 dnů od konce akce, tedy do po 2. 11., a do té doby hodnocení změníš.",
      ),
    ).toBeInTheDocument()
  })

  it("never asks for the event's detail: a former member of the group doesn't get it", async () => {
    await renderPage()
    await screen.findByRole("button", { name: "Odeslat hodnocení" })

    expect(api.get.mock.calls.map(([path]) => path as string)).toEqual(["events/e1/rating"])
  })

  it("without stars, it says so at both questions and sends nothing", async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole("button", { name: "Odeslat hodnocení" }))

    expect(await screen.findAllByText("Vyber 1 až 5 hvězdiček")).toHaveLength(2)
    expect(api.put).not.toHaveBeenCalled()
  })

  it("sends the stars and the trimmed comment, then shows the rating as saved", async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn().mockResolvedValue(undefined)
    api.put.mockReturnValue(asJson(given))
    await renderPage(onSaved)

    const event = await screen.findByRole("radiogroup", { name: "Jak se akce povedla?" })
    await user.click(within(event).getByRole("radio", { name: "5 z 5 hvězd" }))
    const organizer = screen.getByRole("radiogroup", { name: "Jak hodnotíš organizátora?" })
    await user.click(within(organizer).getByRole("radio", { name: "4 z 5 hvězd" }))
    await user.type(screen.getByLabelText("Komentář (nepovinné)"), "  Skvělá parta, příště zase. ")
    await user.click(screen.getByRole("button", { name: "Odeslat hodnocení" }))

    expect(api.put).toHaveBeenCalledWith("events/e1/rating", {
      json: { eventStars: 5, organizerStars: 4, comment: "Skvělá parta, příště zase." },
    })
    expect(await screen.findByRole("button", { name: "Uložit změny" })).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith("Díky, hodnocení je uložené")
    expect(onSaved).toHaveBeenCalled()
  })

  it("an earlier rating fills the form in; an emptied comment is sent as none", async () => {
    const user = userEvent.setup()
    answer = given
    api.put.mockReturnValue(asJson({ ...given, rating: { ...given.rating, comment: null } }))
    await renderPage()

    const event = await screen.findByRole("radiogroup", { name: "Jak se akce povedla?" })
    expect(within(event).getByRole("radio", { name: "5 z 5 hvězd" })).toBeChecked()
    const comment = screen.getByLabelText("Komentář (nepovinné)")
    expect(comment).toHaveValue("Skvělá parta, příště zase.")

    await user.clear(comment)
    await user.click(screen.getByRole("button", { name: "Uložit změny" }))

    expect(api.put).toHaveBeenCalledWith("events/e1/rating", {
      json: { eventStars: 5, organizerStars: 4, comment: null },
    })
  })

  it("an event of a group: the organizer stars go to the group, and the page says so", async () => {
    answer = { ...fresh, event: { ...event, group: { id: "g1", name: "Volejbal Letná" } } }
    await renderPage()

    expect(await screen.findByText("Volejbal Letná · skupina")).toBeInTheDocument()
    expect(
      screen.getByText(/U akce skupiny se hodnocení organizátora počítá skupině\.$/),
    ).toBeInTheDocument()
  })

  it("a refusal from the server keeps the stars and says why", async () => {
    const user = userEvent.setup()
    api.put.mockReturnValue({
      json: () =>
        Promise.reject(
          new FakeHTTPError(409, {
            code: "RATING_WINDOW_CLOSED",
            message: "Hodnotit šlo jen 14 dní po akci.",
          }),
        ),
    })
    await renderPage()

    const event = await screen.findByRole("radiogroup", { name: "Jak se akce povedla?" })
    await user.click(within(event).getByRole("radio", { name: "3 z 5 hvězd" }))
    const organizer = screen.getByRole("radiogroup", { name: "Jak hodnotíš organizátora?" })
    await user.click(within(organizer).getByRole("radio", { name: "3 z 5 hvězd" }))
    await user.click(screen.getByRole("button", { name: "Odeslat hodnocení" }))

    expect(toast.error).toHaveBeenCalledWith("Hodnotit šlo jen 14 dní po akci.")
  })

  it.each([
    ["EVENT_NOT_ENDED", "Hodnotit půjde, až akce skončí", "Pak na to budeš mít 14 dní."],
    ["EVENT_NOT_PUBLISHED", "Akce je zrušená", "Zrušenou akci hodnotit nejde."],
    ["RATING_DELETED", "Hodnocení odstranil správce", "Znovu ho dát nejde."],
  ])("%s: no form, why not, and a way on", async (refusal, title, body) => {
    answer = { ...fresh, refusal }
    await renderPage()

    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.getByText(body)).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Najdi další akci" })).toHaveAttribute("href", "/akce")
  })

  it("after the window, the rating given stays to read", async () => {
    answer = { ...given, refusal: "RATING_WINDOW_CLOSED" }
    await renderPage()

    expect(await screen.findByText("Hodnotit už nejde")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Hodnotit šlo jen 14 dní po akci. Tvoje hodnocení: akce ★ 5, organizátor ★ 4.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /hodnocení|změny/ })).not.toBeInTheDocument()
  })

  it("someone who wasn't there (403) is told so in the API's words", async () => {
    answer = new FakeHTTPError(403, {
      code: "NOT_PARTICIPANT",
      message: "Hodnotit může jen ten, kdo byl na akci přihlášený.",
    })
    await renderPage()

    expect(await screen.findByText("Tuhle akci hodnotit nemůžeš")).toBeInTheDocument()
    expect(
      screen.getByText(/^Hodnotit může jen ten, kdo byl na akci přihlášený\./),
    ).toBeInTheDocument()
  })

  it("the organizer (403 OWN_EVENT) is sent back to the management", async () => {
    answer = new FakeHTTPError(403, {
      code: "OWN_EVENT",
      message: "Svou vlastní akci hodnotit nejde.",
    })
    await renderPage()

    expect(await screen.findByText("Svou akci nehodnotíš")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Zpět na správu akce" })).toHaveAttribute(
      "href",
      "/akce/e1/sprava",
    )
  })

  it("for the organizer 403 OWN_EVENT is an answer, not a failure (review #313)", async () => {
    // the page can't tell the organizer before asking: it has no event's detail to look at
    answer = new FakeHTTPError(403, {
      code: "OWN_EVENT",
      message: "Svou vlastní akci hodnotit nejde.",
    })
    await renderPage()
    await screen.findByText("Svou akci nehodnotíš")

    // asked once, not retried; no error toast, no form, no „Zkusit znovu“
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Zkusit znovu" })).not.toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })

  it("an unknown, hidden or deleted event (404) points to the events", async () => {
    answer = new FakeHTTPError(404, { message: "Akce neexistuje." })
    await renderPage()

    expect(await screen.findByText("Akce neexistuje")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Prohlédni si akce" })).toHaveAttribute("href", "/akce")
  })

  it("any other error can be tried again", async () => {
    const user = userEvent.setup()
    answer = new FakeHTTPError(500, { message: "Něco se pokazilo na naší straně. Zkus to znovu." })
    await renderPage()

    expect(
      await screen.findByText("Něco se pokazilo na naší straně. Zkus to znovu."),
    ).toBeInTheDocument()
    answer = fresh
    await user.click(screen.getByRole("button", { name: "Zkusit znovu" }))

    expect(await screen.findByRole("button", { name: "Odeslat hodnocení" })).toBeInTheDocument()
  })
})
