import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { GroupOrganizer } from "@/features/groups/components/GroupOrganizer"

const group: GroupDetail = {
  id: "g-deskovky",
  name: "Deskovky Vinohrady",
  type: "public",
  activity: {
    id: "a-deskove-hry",
    slug: "deskove-hry",
    name: "Deskové hry",
    category: { id: "c-hry", slug: "hry", name: "Hry", icon: "dice" },
  },
  locality: { id: "l-praha-2", slug: "praha-2", name: "Praha 2" },
  memberCount: 5,
  description: null,
  status: "active",
  admins: [
    { id: "u-lucie", name: "Lucie Svobodová" },
    { id: "u-tomas", name: "Tomáš Dvořák" },
  ],
  viewerMembership: null,
}

describe("GroupOrganizer (A-05g)", () => {
  it("the group's card leads to the group, each admin's name to their public profile (#289)", async () => {
    await renderWithRouter(<GroupOrganizer group={group} />)

    expect(screen.getByRole("link", { name: /Deskovky Vinohrady/ })).toHaveAttribute(
      "href",
      "/skupiny/g-deskovky",
    )
    expect(screen.getByRole("link", { name: "Lucie Svobodová" })).toHaveAttribute(
      "href",
      "/uzivatele/u-lucie",
    )
    expect(screen.getByRole("link", { name: "Tomáš Dvořák" })).toHaveAttribute(
      "href",
      "/uzivatele/u-tomas",
    )
    expect(screen.getAllByText("Správce skupiny")).toHaveLength(2)
  })
})
