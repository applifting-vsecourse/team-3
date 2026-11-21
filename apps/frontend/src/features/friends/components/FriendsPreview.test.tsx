import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { FriendLists } from "@/features/friends/api/friendsSchemas"
import { FriendsPreview } from "@/features/friends/components/FriendsPreview"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const person = (n: number) => ({ id: `p${n}`, name: `Člověk ${n}`, interests: [] })
const request = (n: number) => ({
  person: person(n),
  requestedAt: new Date(`2026-11-1${n}T10:00:00Z`),
})
const lists = (changes: Partial<FriendLists> = {}): FriendLists => ({
  friends: [],
  incoming: [],
  outgoing: [],
  ...changes,
})

const show = (data: FriendLists) => {
  api.get.mockReturnValue({ json: () => Promise.resolve(JSON.parse(JSON.stringify(data))) })
  return renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <FriendsPreview viewerId="jakub" />
    </QueryClientProvider>,
  )
}
const friendLinks = () =>
  within(screen.getByRole("list", { name: "Přátelé" })).getAllByRole("listitem")

describe("„Lidé, které znám“ on Můj profil (Figma B-05f, #307)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("nobody yet: one sentence, no links", async () => {
    await show(lists())

    expect(
      await screen.findByText("Zatím tu nikoho nemáš. Přátele si přidáš na jejich profilu."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Všechn|Odeslané/ })).not.toBeInTheDocument()
    expect(
      screen
        .getByRole("heading", { level: 2, name: "Lidé, které znám" })
        .querySelector(".highlight-keyword"),
    ).toHaveTextContent("znám")
  })

  it("the two newest requests waiting for me, then all of them on /profil/pratele", async () => {
    await show(lists({ incoming: [request(7), request(6), request(5)] }))

    const requests = await screen.findByRole("group", { name: "Žádosti o přátelství (3)" })
    expect(within(requests).getAllByRole("button", { name: "Přijmout" })).toHaveLength(2)
    expect(within(requests).queryByText("Člověk 5")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Všechny žádosti (3)" })).toHaveAttribute(
      "href",
      "/profil/pratele?tab=zadosti",
    )
  })

  it("two requests or fewer: no link to all of them", async () => {
    await show(lists({ incoming: [request(7), request(6)] }))

    await screen.findByRole("group", { name: "Žádosti o přátelství (2)" })
    expect(screen.queryByRole("link", { name: /Všechny žádosti/ })).not.toBeInTheDocument()
  })

  it("my own requests only as a link, with the sentence when there are no friends yet (B-05 · Jen odeslaná žádost)", async () => {
    await show(lists({ outgoing: [request(6)] }))

    expect(await screen.findByRole("link", { name: "Odeslané žádosti (1)" })).toHaveAttribute(
      "href",
      "/profil/pratele?tab=zadosti",
    )
    expect(screen.queryByRole("button", { name: "Zrušit žádost" })).not.toBeInTheDocument()
    expect(
      screen.getByText("Zatím tu nikoho nemáš. Přátele si přidáš na jejich profilu."),
    ).toBeInTheDocument()
  })

  it("six friends at most, the fifth and sixth hidden on a phone, then all of them", async () => {
    await show(lists({ friends: [1, 2, 3, 4, 5, 6, 7, 8].map(person) }))

    await screen.findByRole("group", { name: "Přátelé (8)" })
    const rows = friendLinks()
    expect(rows).toHaveLength(6)
    expect(rows.map((row) => row.classList.contains("max-md:hidden"))).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
    ])
    const all = screen.getByRole("link", { name: "Všichni přátelé (8)" })
    expect(all).toHaveAttribute("href", "/profil/pratele?tab=pratele")
    expect(all).not.toHaveClass("md:hidden")
  })

  it("five or six friends: a desktop shows them all, so the link is the phone's only", async () => {
    await show(lists({ friends: [1, 2, 3, 4, 5].map(person) }))

    expect(await screen.findByRole("link", { name: "Všichni přátelé (5)" })).toHaveClass(
      "md:hidden",
    )
  })

  it("four friends or fewer: all of them, no link", async () => {
    await show(lists({ friends: [1, 2, 3].map(person) }))

    await screen.findByRole("group", { name: "Přátelé (3)" })
    expect(friendLinks()).toHaveLength(3)
    expect(screen.queryByRole("link", { name: /Všichni přátelé/ })).not.toBeInTheDocument()
  })
})
