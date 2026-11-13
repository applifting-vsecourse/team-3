import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { MyGroup } from "@/features/groups/api/groupSchemas"
import { MemberGroups, RunningGroups } from "@/features/groups/components/MyGroups"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const aGroup = (
  id: string,
  name: string,
  membership: MyGroup["membership"],
  type: MyGroup["type"] = "public",
  pendingRequests: number | null = null,
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
  pendingRequests,
})

// Figma A-07m: Petra waits in Deskovky, is a member of Běžci and runs Volejbal
const petra = [
  aGroup("g-deskovky", "Deskovky Vinohrady", { role: "member", status: "pending" }, "closed"),
  aGroup("g-bezci", "Běžci ze Stromovky", { role: "member", status: "active" }),
  aGroup(
    "g-volejbal",
    "Volejbal Praha 7 – po práci",
    { role: "admin", status: "active" },
    "public",
    1,
  ),
]

const respond = (body: unknown) => api.get.mockReturnValue({ json: () => Promise.resolve(body) })

const withQueryClient = (ui: ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {ui}
  </QueryClientProvider>
)

const renderMember = () =>
  renderWithRouter(withQueryClient(<MemberGroups viewerId="u-petra" />))
const renderRunning = () =>
  renderWithRouter(withQueryClient(<RunningGroups viewerId="u-petra" />))

beforeEach(() => api.get.mockReset())

describe("MemberGroups – Moje › Skupiny › Jsem členem (Figma C-04, #304)", () => {
  it("my waiting requests on top with the badge of an event's request, then the groups I am in", async () => {
    respond(petra)
    await renderMember()

    const pending = await screen.findByRole("region", { name: "Čeká na schválení (1)" })
    expect(within(pending).getByText("Deskovky Vinohrady")).toBeInTheDocument()
    expect(within(pending).getByText("Čeká na schválení")).toBeInTheDocument()
    expect(within(pending).getByText("Neveřejná")).toBeInTheDocument()

    const joined = screen.getByRole("region", { name: "Jsem členem (1)" })
    expect(within(joined).getByText("Běžci ze Stromovky")).toBeInTheDocument()
    expect(within(joined).getByRole("link", { name: /Běžci ze Stromovky/ })).toHaveAttribute(
      "href",
      "/skupiny/g-bezci",
    )
    // the groups I run are in Spravuju
    expect(screen.queryByText("Volejbal Praha 7 – po práci")).not.toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("me/groups")
  })

  it("no section without groups", async () => {
    respond([petra[1]])
    await renderMember()

    expect(await screen.findByRole("region", { name: "Jsem členem (1)" })).toBeInTheDocument()
    expect(screen.queryByText(/Čeká na schválení/)).not.toBeInTheDocument()
  })

  it("empty: one sentence and a way to all groups, also when I only run groups", async () => {
    respond([petra[2]])
    await renderMember()

    expect(
      await screen.findByText(
        "Zatím nejsi v žádné skupině. Najdi partu, se kterou se budete potkávat pravidelně.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Projít všechny skupiny" })).toHaveAttribute(
      "href",
      "/skupiny",
    )
  })

  it("loading, then an error with a retry", async () => {
    api.get.mockReturnValue({ json: () => Promise.reject(new Error("HTTP 500")) })
    await renderMember()

    expect(screen.getByLabelText("Načítám moje skupiny")).toBeInTheDocument()
    expect(await screen.findByText("Skupiny se nepodařilo načíst")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
  })
})

describe("RunningGroups – Moje › Skupiny › Spravuju (Figma C-05, #304)", () => {
  it("the strip sums up the requests, the card says how many wait and opens the management", async () => {
    respond(petra)
    await renderRunning()

    const strip = await screen.findByRole("status")
    expect(within(strip).getByText("1 žádost o členství čeká na schválení")).toBeInTheDocument()
    expect(within(strip).getByText("Volejbal Praha 7 – po práci (1)")).toBeInTheDocument()

    const running = screen.getByRole("region", { name: "Spravuju (1)" })
    expect(within(running).getByText("Běh · Praha 7 · 1 žádost čeká")).toBeInTheDocument()
    expect(within(running).getByRole("link", { name: /Volejbal Praha 7/ })).toHaveAttribute(
      "href",
      "/skupiny/g-volejbal/sprava",
    )
    expect(screen.queryByText("Běžci ze Stromovky")).not.toBeInTheDocument()
  })

  it("no strip when nothing waits; the card shows its members", async () => {
    respond([{ ...petra[2]!, pendingRequests: 0 }])
    await renderRunning()

    expect(await screen.findByText("Běh · Praha 7 · 6 členů")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("empty: one sentence; „Založit skupinu“ is the page's", async () => {
    respond([petra[1]])
    await renderRunning()

    expect(
      await screen.findByText(
        "Zatím nespravuješ žádnou skupinu. Založ ji a parta se bude potkávat pravidelně.",
      ),
    ).toBeInTheDocument()
  })
})
