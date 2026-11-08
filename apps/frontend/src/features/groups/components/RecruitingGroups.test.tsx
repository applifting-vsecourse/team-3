import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { RecruitingGroups } from "@/features/groups/components/RecruitingGroups"

const group = (id: string, type: "public" | "closed") => ({
  id,
  name: `Skupina ${id}`,
  type,
  activity: {
    id: "a1",
    slug: "florbal",
    name: "Florbal",
    category: { id: "c1", slug: "tymove-sporty", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l1", slug: "praha-9", name: "Praha 9" },
  memberCount: 4,
})

describe("RecruitingGroups", () => {
  it("lists the groups as links to their pages, „Všechny skupiny“ in the page's locality", async () => {
    await renderWithRouter(
      <RecruitingGroups
        groups={[group("g1", "public"), group("g2", "closed")]}
        lokalita="praha"
      />,
    )

    expect(
      screen.getByRole("heading", { level: 2, name: "Tyhle skupiny rozšiřují partu" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Skupina g1/ })).toHaveAttribute("href", "/skupiny/g1")
    expect(screen.getAllByText("Florbal · Praha 9 · 4 členové")).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: /Všechny skupiny/ })[0]).toHaveAttribute(
      "href",
      "/skupiny?lokalita=praha",
    )
  })

  it("no groups, no section", async () => {
    await renderWithRouter(
      <RecruitingGroups
        groups={[]}
        lokalita="praha"
      />,
    )

    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
  })
})
