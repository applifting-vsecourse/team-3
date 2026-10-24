import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { GroupDetail, Membership } from "@/features/groups/api/groupSchemas"
import { GroupMembershipAction } from "@/features/groups/components/GroupMembershipAction"

const { api } = vi.hoisted(() => ({ api: { post: vi.fn(() => Promise.resolve()) } }))
vi.mock("@/lib/api-client", () => ({ api }))

const group: GroupDetail = {
  id: "g-florbal",
  name: "Florbal Praha 9 – pokročilí",
  type: "closed",
  activity: {
    id: "a-florbal",
    slug: "florbal",
    name: "Florbal",
    category: { id: "c-tymove-sporty", slug: "tymove-sporty", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l-praha-9", slug: "praha-9", name: "Praha 9" },
  memberCount: 5,
  description: null,
  status: "active",
  admins: [{ id: "u-tomas", name: "Tomáš Dvořák" }],
  viewerMembership: null,
}

const render = (
  overrides: Partial<GroupDetail> = {},
  { isSignedIn = true }: { isSignedIn?: boolean } = {},
) =>
  renderWithRouter(
    withQueryClient(
      <GroupMembershipAction
        group={{ ...group, ...overrides }}
        isSignedIn={isSignedIn}
        signInFrom="%2Fskupiny%2Fg-florbal"
      />,
    ),
  )

const withQueryClient = (ui: ReactElement) => (
  <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
)

const as = (membership: Membership) => ({ viewerMembership: membership })

// Figma: A-08 · Stavy tlačítka skupiny
describe("GroupMembershipAction", () => {
  it("a visitor goes to sign in and comes back", async () => {
    await render({}, { isSignedIn: false })
    expect(screen.getByRole("link", { name: "Přidat se" })).toHaveAttribute(
      "href",
      "/login?from=%252Fskupiny%252Fg-florbal",
    )
  })

  it("a public group: „Přidat se“", async () => {
    await render({ type: "public" })
    expect(screen.getByRole("button", { name: "Přidat se" })).toBeEnabled()
    expect(screen.queryByText("Správce žádost schválí nebo zamítne.")).not.toBeInTheDocument()
  })

  it("a closed group: „Požádat o členství“ and who decides", async () => {
    await render()
    expect(screen.getByRole("button", { name: "Požádat o členství" })).toBeEnabled()
    expect(screen.getByText("Správce žádost schválí nebo zamítne.")).toBeInTheDocument()
  })

  it("a pending request waits for the named admin", async () => {
    await render(as({ role: "member", status: "pending" }))
    expect(screen.getByText("Žádost čeká na schválení")).toBeInTheDocument()
    expect(screen.getByText("Schválí nebo zamítne ji Tomáš Dvořák.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Stáhnout žádost" })).toBeEnabled()
  })

  it("withdrawing a request is confirmed first", async () => {
    await render(as({ role: "member", status: "pending" }))

    await userEvent.click(screen.getByRole("button", { name: "Stáhnout žádost" }))
    const dialog = await screen.findByRole("dialog", { name: "Stáhnout žádost o členství?" })
    expect(api.post).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Stáhnout žádost" }))
    expect(api.post).toHaveBeenCalledWith("groups/g-florbal/leave")
  })

  it("a member can leave", async () => {
    await render(as({ role: "member", status: "active" }))
    expect(screen.getByText("Jsi členem skupiny")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Odejít ze skupiny" })).toBeEnabled()
  })

  it("an admin goes to the management", async () => {
    await render(as({ role: "admin", status: "active" }))
    expect(screen.getByRole("link", { name: "Spravovat skupinu" })).toHaveAttribute(
      "href",
      "/skupiny/g-florbal/sprava",
    )
  })

  it("a deactivated group and a blocked user get nothing", async () => {
    const { container, rerender } = await render({ status: "inactive" })
    expect(container).toBeEmptyDOMElement()

    rerender(
      withQueryClient(
        <GroupMembershipAction
          group={{ ...group, viewerMembership: { role: "member", status: "blocked" } }}
          isSignedIn
          signInFrom=""
        />,
      ),
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
