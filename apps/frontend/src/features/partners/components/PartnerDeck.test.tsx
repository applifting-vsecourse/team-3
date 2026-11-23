import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Partner, PartnerPage } from "@/features/partners/api/partnersSchemas"
import { PartnerDeck } from "@/features/partners/components/PartnerDeck"

const { api, toast } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast }))

const partner = (id: string, name: string, changes: Partial<Partner> = {}): Partner => ({
  id,
  name,
  distanceBandKm: 5,
  sharedInterests: [{ id: "volejbal", name: "Volejbal", slug: "volejbal" }],
  otherInterests: [{ id: "beh", name: "Běh", slug: "beh" }],
  hasRequestedMe: false,
  ...changes,
})
const TOMAS = partner("tomas", "Tomáš Novák")
const PETRA = partner("petra", "Petra Malá", { distanceBandKm: 2 })
const page = (changes: Partial<PartnerPage> = {}): PartnerPage => ({
  items: [TOMAS, PETRA],
  nextCursor: null,
  radiusKm: 10,
  missing: [],
  requestsLeft: 20,
  ...changes,
})
const asJson = (body: unknown) => ({ json: () => Promise.resolve(body) })
const refusal = (message: string) => ({ json: () => Promise.reject(new Error(message)) })

const show = async (data: PartnerPage | PartnerPage[] = page(), onWiden = vi.fn()) => {
  const pages = Array.isArray(data) ? data : [data]
  api.get.mockImplementation((_path: string, options: { searchParams: { cursor?: string } }) =>
    asJson(options.searchParams.cursor ? pages[1] : pages[0]),
  )
  api.post.mockImplementation((path: string) =>
    path.endsWith("/request")
      ? asJson({ state: "outgoing", requestsLeft: 19 })
      : { json: () => Promise.resolve(undefined) },
  )
  api.delete.mockReturnValue({ json: () => Promise.resolve(undefined) })
  const result = await renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PartnerDeck
        viewerId="jana"
        viewerName="Jana Nová"
        radiusKm={10}
        onWiden={onWiden}
      />
    </QueryClientProvider>,
  )
  await screen.findByRole("article")
  return result
}

const topName = () => within(screen.getByRole("article")).getByRole("heading", { level: 2 })
const status = () => screen.getAllByRole("status").find((element) => element.textContent)

describe("Najdi parťáka: the deck (#84)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the best fit with public data only: name to the profile, the distance band, the interests", async () => {
    await show()

    const card = screen.getByRole("article", { name: "Tomáš Novák" })
    expect(within(card).getByRole("link", { name: "Tomáš Novák" })).toHaveAttribute(
      "href",
      "/uzivatele/tomas",
    )
    expect(within(card).getByText("asi 5 km")).toBeInTheDocument()
    expect(within(card).getByText("Oba vás baví")).toBeInTheDocument()
    expect(within(card).getByRole("list", { name: "Zájmy" })).toHaveTextContent("Volejbal")
    // the card under it is only a picture
    expect(screen.getAllByRole("article")).toHaveLength(1)
  })

  it("Teď ne skips: sent at once, the next one comes up, focus stays on the button", async () => {
    const user = userEvent.setup()
    await show()

    const skip = screen.getByRole("button", { name: "Teď ne" })
    await user.click(skip)

    expect(api.post).toHaveBeenCalledWith("partners/tomas/skip")
    await waitFor(() => expect(topName()).toHaveTextContent("Petra Malá"))
    expect(skip).toHaveFocus()
    expect(status()).toHaveTextContent("Přeskočeno. Další: Petra Malá, do 2 km, 1 společný zájem.")
  })

  it("Vrátit brings back the last skip and forgets it on the server", async () => {
    const user = userEvent.setup()
    await show()
    const undo = screen.getByRole("button", { name: "Vrátit poslední přeskočení" })
    expect(undo).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Teď ne" }))
    await waitFor(() => expect(topName()).toHaveTextContent("Petra Malá"))
    await user.click(undo)

    expect(api.delete).toHaveBeenCalledWith("partners/tomas/skip")
    expect(topName()).toHaveTextContent("Tomáš Novák")
    expect(undo).toBeDisabled()
    expect(status()).toHaveTextContent("Vráceno: Tomáš Novák.")
  })

  it("Přidat sends the friendship request and announces it", async () => {
    const user = userEvent.setup()
    await show()

    await user.click(screen.getByRole("button", { name: "Přidat" }))

    expect(api.post).toHaveBeenCalledWith("partners/tomas/request")
    await waitFor(() =>
      expect(status()).toHaveTextContent("Žádost odeslána: Tomáš Novák. Další: Petra Malá"),
    )
    expect(topName()).toHaveTextContent("Petra Malá")
  })

  it("the arrow keys do the same while focus is in the deck", async () => {
    const user = userEvent.setup()
    await show()

    screen.getByRole("button", { name: "Teď ne" }).focus()
    await user.keyboard("{ArrowLeft}")
    expect(api.post).toHaveBeenCalledWith("partners/tomas/skip")
    await waitFor(() => expect(topName()).toHaveTextContent("Petra Malá"))

    await user.keyboard("{Backspace}")
    expect(api.delete).toHaveBeenCalledWith("partners/tomas/skip")
    expect(topName()).toHaveTextContent("Tomáš Novák")

    // a second commit waits out the lock that stops a double press from skipping two people
    await new Promise((resolve) => setTimeout(resolve, 250))
    await user.keyboard("{ArrowRight}")
    expect(api.post).toHaveBeenCalledWith("partners/tomas/request")
  })

  it("a double press skips one person, not two", async () => {
    const user = userEvent.setup()
    await show()

    await user.dblClick(screen.getByRole("button", { name: "Teď ne" }))

    expect(api.post).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(topName()).toHaveTextContent("Petra Malá"))
  })

  it("a swipe right is Přidat, a short drag springs back and does nothing", async () => {
    await show()
    const card = screen.getByRole("article").parentElement!

    fireEvent.pointerDown(card, { pointerId: 1, button: 0, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 4, clientY: 1 })
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 4, clientY: 1 })
    expect(topName()).toHaveTextContent("Tomáš Novák")

    fireEvent.pointerDown(card, { pointerId: 2, button: 0, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(card, { pointerId: 2, clientX: 60, clientY: 5 })
    fireEvent.pointerMove(card, { pointerId: 2, clientX: 160, clientY: 8 })
    fireEvent.pointerUp(card, { pointerId: 2, clientX: 160, clientY: 8 })

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("partners/tomas/request"))
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it("their request waiting for me: Přidat is the match, with the way to a common event", async () => {
    const user = userEvent.setup()
    await show(page({ items: [partner("eva", "Eva Horáková", { hasRequestedMe: true })] }))
    api.post.mockReturnValue(asJson({ state: "friends", requestsLeft: 20 }))

    expect(screen.getByText("Posílá ti žádost")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Přidat" }))

    const dialog = await screen.findByRole("dialog", { name: "Je to shoda!" })
    expect(dialog).toHaveTextContent(
      "Eva Horáková tě chce taky přidat. Teď jste přátelé a uvidíte navzájem, kam chodíte.",
    )
    expect(within(dialog).getByRole("link", { name: "Najít společnou akci" })).toHaveAttribute(
      "href",
      expect.stringContaining("aktivita=volejbal"),
    )
    expect(within(dialog).getByRole("link", { name: "Zobrazit profil" })).toHaveAttribute(
      "href",
      "/uzivatele/eva",
    )
    await user.click(within(dialog).getByRole("button", { name: "Hledat dál" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("a failure brings the card back with the API's message", async () => {
    const user = userEvent.setup()
    await show()
    api.post.mockReturnValue(refusal("Žádost se nepodařilo odeslat. Zkus to znovu."))

    await user.click(screen.getByRole("button", { name: "Přidat" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Žádost se nepodařilo odeslat. Zkus to znovu."),
    )
    expect(topName()).toHaveTextContent("Tomáš Novák")
  })

  it("counts down today's additions from five and stops Přidat at zero, Teď ne still works", async () => {
    const user = userEvent.setup()
    await show(page({ requestsLeft: 1 }))
    expect(screen.getByText("Dnes ještě 1 přidání.")).toBeInTheDocument()
    api.post.mockImplementation((path: string) =>
      path.endsWith("/request")
        ? asJson({ state: "outgoing", requestsLeft: 0 })
        : { json: () => Promise.resolve(undefined) },
    )

    await user.click(screen.getByRole("button", { name: "Přidat" }))

    await waitFor(() => expect(screen.getByRole("button", { name: "Přidat" })).toBeDisabled())
    expect(
      screen.getByText("Na dnešek máš přidáno dost. Další lidi můžeš přidat zítra."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Teď ne" })).toBeEnabled()
  })

  it("loads the next page before the cards run out", async () => {
    const many = Array.from({ length: 6 }, (_, index) => partner(`p${index}`, `Člověk ${index}`))
    await show([
      page({ items: many, nextCursor: "next" }),
      page({ items: [partner("q", "Další člověk")] }),
    ])
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Teď ne" }))

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("partners/suggestions", {
        searchParams: { radiusKm: 10, cursor: "next" },
      }),
    )
  })

  it("nobody left: says so, offers the wider radius and moves focus there", async () => {
    const user = userEvent.setup()
    const onWiden = vi.fn()
    await show(page({ items: [TOMAS] }), onWiden)

    await user.click(screen.getByRole("button", { name: "Teď ne" }))

    const heading = await screen.findByRole("heading", {
      name: "V okolí 10 km teď nikdo další není.",
    })
    await waitFor(() => expect(heading).toHaveFocus())
    await user.click(screen.getByRole("button", { name: "Hledat do 25 km" }))
    expect(onWiden).toHaveBeenCalledWith(25)
  })

  it("without a home locality the profile comes first", async () => {
    api.get.mockReturnValue(asJson(page({ items: [], missing: ["locality"] })))
    await renderWithRouter(
      <QueryClientProvider client={new QueryClient()}>
        <PartnerDeck
          viewerId="jana"
          viewerName="Jana Nová"
          radiusKm={10}
          onWiden={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole("heading", {
        name: "Nastav si domovské místo, ať víme, koho ti ukázat.",
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Nastavit v profilu" })).toHaveAttribute(
      "href",
      "/profil/upravit",
    )
  })

  it("an error says so in the card's place, with a retry", async () => {
    api.get.mockReturnValue(refusal("boom"))
    await renderWithRouter(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <PartnerDeck
          viewerId="jana"
          viewerName="Jana Nová"
          radiusKm={10}
          onWiden={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Lidi z okolí se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.",
    )
    api.get.mockReturnValue(asJson(page()))
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    })
    expect(await screen.findByRole("article")).toBeInTheDocument()
  })
})
