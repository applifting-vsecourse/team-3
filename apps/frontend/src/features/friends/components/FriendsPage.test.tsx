import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { FriendLists } from "@/features/friends/api/friendsSchemas"
import { FriendsPage } from "@/features/friends/components/FriendsPage"
import type { FriendsTab } from "@/features/friends/lib/friends"

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const person = (id: string, name: string, interests: string[] = []) => ({
  id,
  name,
  interests: interests.map((interest) => ({ id: interest, name: interest })),
})
const lists = (changes: Partial<FriendLists> = {}): FriendLists => ({
  friends: [
    person("eva", "Eva Horáková", ["Jóga", "Turistika"]),
    person("petra", "Petra Nováková"),
  ],
  incoming: [],
  outgoing: [],
  ...changes,
})
// what the API sends: dates as ISO strings
const asJson = (body: unknown) => ({
  json: () => Promise.resolve(JSON.parse(JSON.stringify(body))),
})

const show = (
  data: FriendLists,
  urlTab?: FriendsTab,
  onTabChange = vi.fn(),
  emptyFriendsActions?: ReactNode,
) => {
  api.get.mockReturnValue(asJson(data))
  return renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <FriendsPage
        viewerId="jakub"
        urlTab={urlTab}
        onTabChange={onTabChange}
        emptyFriendsActions={emptyFriendsActions}
      />
    </QueryClientProvider>,
  )
}

describe("/profil/pratele (Figma B-09, #307)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("opens on Přátelé: the friends with their interests, leading to their profiles", async () => {
    await show(lists())

    const friends = await screen.findByRole("list", { name: "Přátelé" })
    expect(within(friends).getByRole("link", { name: "Eva Horáková" })).toHaveAttribute(
      "href",
      "/uzivatele/eva",
    )
    expect(within(friends).getByText("Jóga · Turistika")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Přátelé · 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: "Žádosti · 0" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Lidé, které znám" })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("friends")
  })

  it("opens on Žádosti while a request waits for me", async () => {
    await show(
      lists({
        incoming: [
          { person: person("tomas", "Tomáš Dvořák"), requestedAt: new Date("2026-11-17") },
        ],
      }),
    )

    expect(await screen.findByRole("tab", { name: "Žádosti · 1" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  it("the chip in the URL wins and a click asks to change it", async () => {
    const onTabChange = vi.fn()
    await show(lists(), "zadosti", onTabChange)

    expect(await screen.findByText("Žádné žádosti o přátelství.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: "Přátelé · 2" }))
    expect(onTabChange).toHaveBeenCalledWith("pratele")
  })

  it("searches the friends by name, without diacritics, and says when nobody matches", async () => {
    await show(lists())

    const search = await screen.findByRole("searchbox", { name: "Hledat mezi přáteli" })
    await userEvent.type(search, "novakova")
    expect(screen.getByRole("link", { name: "Petra Nováková" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Eva Horáková" })).not.toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, "Radek")
    expect(
      screen.getByText("Nikoho takového mezi přáteli nemáš. Přátele si přidáš na jejich profilu."),
    ).toBeInTheDocument()
  })

  it("nobody yet: the sentence, the ways to friends the route passes in and the warning, no search (#474)", async () => {
    await show(
      lists({ friends: [] }),
      undefined,
      vi.fn(),
      <>
        <a href="/partaci">Najdi parťáka</a>
        <button type="button">Poslat pozvánku</button>
      </>,
    )

    expect(
      await screen.findByText("Zatím tu nikoho nemáš. Najdi parťáky z okolí, nebo pozvi kamaráda."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Najdi parťáka" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Poslat pozvánku" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Přátelé vidí, na které akce jdeš, tak odkaz posílej jen lidem, které znáš.",
      ),
    ).toHaveClass("text-caption", "text-muted-foreground")
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
  })

  it("a search finding nobody has no way to new friends, only the sentence (#474)", async () => {
    await show(lists(), undefined, vi.fn(), <button type="button">Poslat pozvánku</button>)

    await userEvent.type(await screen.findByRole("searchbox"), "Radek")

    expect(
      screen.getByText("Nikoho takového mezi přáteli nemáš. Přátele si přidáš na jejich profilu."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Poslat pozvánku" })).not.toBeInTheDocument()
  })

  it("Žádosti: waiting for me with Odmítnout / Přijmout, mine with Zrušit žádost", async () => {
    api.post.mockReturnValue(asJson({ state: "friends" }))
    api.delete.mockReturnValue(asJson({ state: "none" }))
    await show(
      lists({
        incoming: [
          {
            person: person("tomas", "Tomáš Dvořák"),
            requestedAt: new Date("2026-11-17T10:00:00Z"),
          },
        ],
        outgoing: [
          {
            person: person("simona", "Simona Urbanová"),
            requestedAt: new Date("2026-11-16T10:00:00Z"),
          },
        ],
      }),
      "zadosti",
    )

    const incoming = await screen.findByRole("region", { name: "Příchozí (1)" })
    expect(within(incoming).getByText("Posílá ti žádost · 17. 11.")).toBeInTheDocument()
    await userEvent.click(within(incoming).getByRole("button", { name: "Přijmout" }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("friends/tomas"))

    const outgoing = screen.getByRole("region", { name: "Odeslané (1)" })
    expect(within(outgoing).getByText("Žádost odeslána 16. 11.")).toBeInTheDocument()
    await userEvent.click(within(outgoing).getByRole("button", { name: "Zrušit žádost" }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("friends/simona"))
  })

  it("a failed load offers to try again", async () => {
    api.get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    api.get.mockReturnValue(asJson(lists()))
    await renderWithRouter(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <FriendsPage
          viewerId="jakub"
          urlTab={undefined}
          onTabChange={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(await screen.findByText("Lidi, které znáš, se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByRole("list", { name: "Přátelé" })).toBeInTheDocument()
  })
})
