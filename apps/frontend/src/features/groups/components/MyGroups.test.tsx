import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { MyGroup } from "@/features/groups/api/groupSchemas"
import { MyGroups } from "@/features/groups/components/MyGroups"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const aGroup = (
  id: string,
  name: string,
  membership: MyGroup["membership"],
  type: MyGroup["type"] = "public",
): MyGroup => ({
  id,
  name,
  type,
  activity: {
    id: "a",
    slug: "a",
    name: "Běh",
    category: { id: "c", slug: "c", name: "Pohyb a tanec", icon: "route" },
  },
  locality: { id: "l", slug: "praha-7", name: "Praha 7" },
  memberCount: 6,
  membership,
})

// Figma A-07m: Petra waits in Deskovky, is a member of Běžci and runs Volejbal
const petra = [
  aGroup("g-deskovky", "Deskovky Vinohrady", { role: "member", status: "pending" }, "closed"),
  aGroup("g-bezci", "Běžci ze Stromovky", { role: "member", status: "active" }),
  aGroup("g-volejbal", "Volejbal Praha 7 – po práci", { role: "admin", status: "active" }),
]

const respond = (body: unknown) => api.get.mockReturnValue({ json: () => Promise.resolve(body) })

const withQueryClient = (ui: ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {ui}
  </QueryClientProvider>
)

const renderMine = () => renderWithRouter(withQueryClient(<MyGroups viewerId="u-petra" />))

beforeEach(() => api.get.mockReset())

describe("MyGroups", () => {
  it("my waiting requests on top, apart from my groups", async () => {
    respond(petra)
    await renderMine()

    const pending = await screen.findByRole("region", { name: "Čeká na schválení (1)" })
    expect(within(pending).getByText("Deskovky Vinohrady")).toBeInTheDocument()
    expect(within(pending).getByText("Neveřejná – žádost čeká na schválení")).toBeInTheDocument()

    const mine = screen.getByRole("region", { name: "Moje skupiny (2)" })
    expect(within(mine).getByText("Běžci ze Stromovky")).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("me/groups")
  })

  it("a group I run says so and opens its management, any other its page", async () => {
    respond(petra)
    await renderMine()

    expect(await screen.findByText("Veřejná · Správce")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Volejbal Praha 7/ })).toHaveAttribute(
      "href",
      "/skupiny/g-volejbal/sprava",
    )
    expect(screen.getByRole("link", { name: /Běžci ze Stromovky/ })).toHaveAttribute(
      "href",
      "/skupiny/g-bezci",
    )
  })

  it("no section without groups", async () => {
    respond([petra[1]])
    await renderMine()

    expect(await screen.findByRole("region", { name: "Moje skupiny (1)" })).toBeInTheDocument()
    expect(screen.queryByText(/Čeká na schválení/)).not.toBeInTheDocument()
  })

  it("empty: one sentence and a way to all groups", async () => {
    respond([])
    await renderMine()

    expect(await screen.findByText("Zatím nejsi v žádné skupině.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Projít všechny skupiny" })).toHaveAttribute(
      "href",
      "/skupiny",
    )
  })

  it("loading, then an error with a retry", async () => {
    api.get.mockReturnValue({ json: () => Promise.reject(new Error("HTTP 500")) })
    await renderMine()

    expect(screen.getByLabelText("Načítám moje skupiny")).toBeInTheDocument()
    expect(await screen.findByText("Skupiny se nepodařilo načíst")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
  })
})
