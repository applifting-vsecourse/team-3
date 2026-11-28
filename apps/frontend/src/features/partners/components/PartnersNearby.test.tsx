import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Partner } from "@/features/partners/api/partnersSchemas"
import {
  partnerRowLine,
  PARTNERS_HIDDEN_TOAST,
  PartnersNearby,
} from "@/features/partners/components/PartnersNearby"

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const partner = (id: string, name: string, changes: Partial<Partner> = {}): Partner => ({
  id,
  name,
  distanceBandKm: 5,
  sharedInterests: [{ id: "a1", name: "Volejbal", slug: "volejbal" }],
  otherInterests: [{ id: "a2", name: "Šachy", slug: "sachy" }],
  hasRequestedMe: false,
  ...changes,
})
const people = [
  partner("eva", "Eva Horáková"),
  partner("petr", "Petr Malý", { distanceBandKm: 2 }),
  partner("jana", "Jana Nová", { distanceBandKm: 10 }),
]
const asJson = (body: unknown) => ({ json: () => Promise.resolve(body) })

const show = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <PartnersNearby viewerId="me" />
    </QueryClientProvider>,
  )
  return { ...view, queryClient }
}

describe("Parťáci v okolí on the landing page (#474)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the three people as rows: the name to the public profile, the band and what we share", async () => {
    api.get.mockReturnValue(asJson({ isShown: true, items: people }))
    await show()

    const section = await screen.findByRole("region", { name: "Parťáci v okolí" })
    expect(api.get).toHaveBeenCalledWith("partners/home")
    const rows = within(section).getAllByRole("listitem")
    expect(rows).toHaveLength(3)
    expect(within(section).getByRole("link", { name: "Eva Horáková" })).toHaveAttribute(
      "href",
      "/uzivatele/eva",
    )
    expect(within(section).getByText("asi 5 km · Oba vás baví: volejbal")).toBeInTheDocument()
    expect(within(section).getByText("do 2 km · Oba vás baví: volejbal")).toBeInTheDocument()
    expect(within(section).getAllByRole("link", { name: /Zobrazit všechny/ })[0]).toHaveAttribute(
      "href",
      "/partaci",
    )
    expect(within(section).getByText("Lidi z okolí, které baví to co tebe.")).toBeInTheDocument()
    // the keyword highlighted, one per heading
    expect(within(section).getByText("v okolí")).toHaveClass("highlight-keyword")
  })

  it("no „Přidat“ and no cards: only rows", async () => {
    api.get.mockReturnValue(asJson({ isShown: true, items: people }))
    const { container } = await show()

    await screen.findByRole("region", { name: "Parťáci v okolí" })
    expect(screen.queryByRole("button", { name: /Přidat/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("article")).not.toBeInTheDocument()
    expect(container.querySelector(".bg-card, .rounded-2xl")).toBeNull()
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Skrýt"])
  })

  it("when the API says it isn't shown, it isn't in the page at all", async () => {
    api.get.mockReturnValue(asJson({ isShown: false, items: [] }))
    const { container } = await show()

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
    expect(container).toBeEmptyDOMElement()
  })

  it("loading: row skeletons; an error: no section, nothing to retry", async () => {
    let fail: (error: Error) => void = vi.fn()
    api.get.mockReturnValue({
      json: () =>
        new Promise((_, reject) => {
          fail = reject
        }),
    })
    const { container } = await show()

    expect(screen.getByRole("status", { name: "Načítám parťáky v okolí" })).toBeInTheDocument()
    fail(new Error("offline"))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it("„Skrýt“ asks the server to hide it, says so, and the section is gone", async () => {
    api.get.mockReturnValue(asJson({ isShown: true, items: people }))
    api.post.mockResolvedValue({})
    const { container } = await show()

    await userEvent.click(await screen.findByRole("button", { name: "Skrýt" }))

    expect(api.post).toHaveBeenCalledWith("partners/home/hide")
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(toast.success).toHaveBeenCalledWith(PARTNERS_HIDDEN_TOAST)
    expect(PARTNERS_HIDDEN_TOAST).toBe(
      "Parťáky na úvodní stránce teď skrýváme. Najdeš je dál v profilu.",
    )
  })

  it("„Skrýt“ failing keeps the section and says so", async () => {
    api.get.mockReturnValue(asJson({ isShown: true, items: people }))
    api.post.mockRejectedValue(new Error("offline"))
    await show()

    await userEvent.click(await screen.findByRole("button", { name: "Skrýt" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByRole("region", { name: "Parťáci v okolí" })).toBeInTheDocument()
  })
})

describe("partnerRowLine (#474)", () => {
  it("names every shared activity in the sentence, after the band", () => {
    expect(
      partnerRowLine({
        distanceBandKm: 50,
        sharedInterests: [
          { id: "a", name: "Běh", slug: "beh" },
          { id: "b", name: "Deskové hry", slug: "deskove-hry" },
        ],
      }),
    ).toBe("do 50 km · Oba vás baví: běh, deskové hry")
  })
})
