import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { expectValidDescriptionList } from "@/test/expectValidDescriptionList"
import { renderWithRouter } from "@/test/renderWithRouter"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { GroupProfile } from "@/features/groups/components/GroupProfile"

const group: GroupDetail = {
  id: "g-deskovky",
  name: "Deskovky Vinohrady",
  type: "closed",
  activity: {
    id: "a-deskove-hry",
    slug: "deskove-hry",
    name: "Deskové hry",
    category: { id: "c-hry", slug: "hry", name: "Hry", icon: "dice" },
  },
  locality: { id: "l-praha-2", slug: "praha-2", name: "Praha 2" },
  memberCount: 5,
  description: "Uzavřená parta na euro hry.",
  status: "active",
  admins: [{ id: "u-lucie", name: "Lucie Svobodová" }],
  viewerMembership: null,
}

// the membership action uses mutations
const withQueryClient = (ui: ReactElement) => (
  <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
)

const profile = (overrides: Partial<GroupDetail> = {}) =>
  withQueryClient(
    <GroupProfile
      group={{ ...group, ...overrides }}
      isSignedIn
      signInFrom="%2Fskupiny%2Fg-deskovky"
    />,
  )

describe("GroupProfile", () => {
  it("shows activity, locality, type, approved members, admins and description (A-08)", async () => {
    const { container } = await renderWithRouter(profile())

    expect(
      screen.getByRole("heading", { level: 1, name: "Deskovky Vinohrady" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Deskové hry")).toBeInTheDocument()
    expect(screen.getByText("Praha 2")).toBeInTheDocument()
    expect(screen.getByText("Neveřejná – správce schvaluje žádosti")).toBeInTheDocument()
    expect(screen.getByText("5 členů")).toBeInTheDocument()
    expect(screen.getByText("Lucie Svobodová")).toBeInTheDocument()
    expect(screen.getByText("Uzavřená parta na euro hry.")).toBeInTheDocument()
    expectValidDescriptionList(container.querySelector("dl")!)
  })

  it("the main action follows the viewer's membership", async () => {
    const { rerender } = await renderWithRouter(profile())
    expect(screen.getByRole("button", { name: "Požádat o členství" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Spravovat skupinu" })).not.toBeInTheDocument()

    rerender(profile({ viewerMembership: { role: "admin", status: "active" } }))
    expect(screen.getByRole("link", { name: "Spravovat skupinu" })).toHaveAttribute(
      "href",
      "/skupiny/g-deskovky/sprava",
    )
  })

  it("without a description there is no empty „O skupině“", async () => {
    await renderWithRouter(profile({ description: null }))
    expect(screen.queryByRole("heading", { name: "O skupině" })).not.toBeInTheDocument()
  })
})
