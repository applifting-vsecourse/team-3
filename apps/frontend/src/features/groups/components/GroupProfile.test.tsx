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
}

describe("GroupProfile", () => {
  it("shows activity, locality, type, approved members, admins and description (A-08)", async () => {
    const { container } = await renderWithRouter(
      <GroupProfile
        group={group}
        isAdmin={false}
      />,
    )

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

  it("only an admin is offered the group's management", async () => {
    const { rerender } = await renderWithRouter(
      <GroupProfile
        group={group}
        isAdmin={false}
      />,
    )
    expect(screen.queryByRole("link", { name: "Spravovat skupinu" })).not.toBeInTheDocument()

    rerender(
      <GroupProfile
        group={group}
        isAdmin
      />,
    )
    expect(screen.getByRole("link", { name: "Spravovat skupinu" })).toHaveAttribute(
      "href",
      "/skupiny/g-deskovky/sprava",
    )
  })

  it("without a description there is no empty „O skupině“", async () => {
    await renderWithRouter(
      <GroupProfile
        group={{ ...group, description: null }}
        isAdmin={false}
      />,
    )
    expect(screen.queryByRole("heading", { name: "O skupině" })).not.toBeInTheDocument()
  })
})
