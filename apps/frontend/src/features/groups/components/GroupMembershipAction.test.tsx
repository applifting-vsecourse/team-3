import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

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
        signInFrom="/skupiny/g-florbal"
      />,
    ),
  )

const withQueryClient = (ui: ReactElement) => (
  <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
)

const as = (membership: Membership) => ({ viewerMembership: membership })

beforeEach(() => {
  api.post.mockClear()
})

// Figma: A-08 · Stavy tlačítka skupiny
describe("GroupMembershipAction", () => {
  it("a visitor goes to sign in and comes back", async () => {
    await render({}, { isSignedIn: false })
    expect(screen.getByRole("link", { name: "Přidat se" })).toHaveAttribute(
      "href",
      "/login?from=%2Fskupiny%2Fg-florbal",
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

  it("a public group joins at once, with no dialog and no message", async () => {
    api.post.mockReturnValueOnce({ json: () => Promise.resolve({ status: "active" }) } as never)
    await render({ type: "public" })

    await userEvent.click(screen.getByRole("button", { name: "Přidat se" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith("groups/g-florbal/join", { json: {} })
  })

  it("asking a closed group opens the dialog and sends the message, trimmed (A-08a, #175)", async () => {
    api.post.mockReturnValueOnce({ json: () => Promise.resolve({ status: "pending" }) } as never)
    await render()

    await userEvent.click(screen.getByRole("button", { name: "Požádat o členství" }))
    const dialog = await screen.findByRole("dialog", { name: "Požádat o členství?" })
    expect(dialog).toHaveTextContent(
      "Florbal Praha 9 – pokročilí. Správce žádost schválí nebo zamítne, do té doby ji můžeš stáhnout.",
    )
    expect(api.post).not.toHaveBeenCalled()
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Zpráva pro správce (nepovinné)" }),
      "  Hrál jsem krajskou ligu.\n",
    )
    await userEvent.click(within(dialog).getByRole("button", { name: "Poslat žádost" }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("groups/g-florbal/join", {
        json: { message: "Hrál jsem krajskou ligu." },
      }),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("a request without a message sends none (#175)", async () => {
    api.post.mockReturnValueOnce({ json: () => Promise.resolve({ status: "pending" }) } as never)
    await render()

    await userEvent.click(screen.getByRole("button", { name: "Požádat o členství" }))
    const dialog = await screen.findByRole("dialog", { name: "Požádat o členství?" })
    await userEvent.type(within(dialog).getByRole("textbox"), "   ")
    await userEvent.click(within(dialog).getByRole("button", { name: "Poslat žádost" }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("groups/g-florbal/join", { json: {} }),
    )
  })

  it("a message over 500 characters is not sent; the field says why (#175)", async () => {
    await render()

    await userEvent.click(screen.getByRole("button", { name: "Požádat o členství" }))
    const dialog = await screen.findByRole("dialog", { name: "Požádat o členství?" })
    await userEvent.click(within(dialog).getByRole("textbox"))
    await userEvent.paste("x".repeat(501))
    await userEvent.click(within(dialog).getByRole("button", { name: "Poslat žádost" }))

    expect(await within(dialog).findByText("Zpráva může mít nejvýš 500 znaků")).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
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

  it("an admin goes to the management, or creates an event of the group (#70)", async () => {
    await render(as({ role: "admin", status: "active" }))
    expect(screen.getByRole("link", { name: "Spravovat skupinu" })).toHaveAttribute(
      "href",
      "/skupiny/g-florbal/sprava",
    )
    expect(screen.getByRole("link", { name: "Založit akci skupiny" })).toHaveAttribute(
      "href",
      "/skupiny/g-florbal/akce/nova",
    )
  })

  it("a regular member is not offered to create the group's events", async () => {
    await render(as({ role: "member", status: "active" }))
    expect(screen.queryByRole("link", { name: "Založit akci skupiny" })).not.toBeInTheDocument()
  })

  it("a deactivated group says so and offers nothing (#54)", async () => {
    await render({ status: "inactive" })
    expect(screen.getByText("Skupina už není aktivní")).toBeInTheDocument()
    expect(
      screen.getByText("Nejde se do ní přidat. Proběhlé akce zůstávají v historii."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("a blocked user gets nothing (#63)", async () => {
    const { container } = await render(as({ role: "member", status: "blocked" }))
    expect(container).toBeEmptyDOMElement()
  })
})
