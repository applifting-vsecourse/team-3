import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Group } from "@/features/groups/api/groupSchemas"
import { GroupList } from "@/features/groups/components/GroupList"

// The card links to the group page; a plain anchor is enough without a router.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params }: { children: ReactNode; params: { groupId: string } }) => (
    <a href={`/skupiny/${params.groupId}`}>{children}</a>
  ),
}))

const aGroup = (overrides: Partial<Group> = {}): Group => ({
  id: "g1",
  name: "Florbal Podvinný mlýn",
  type: "public",
  activity: {
    id: "a-florbal",
    slug: "florbal",
    name: "Florbal",
    category: { id: "c-tymove-sporty", slug: "tymove-sporty", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l-praha-9", slug: "praha-9", name: "Praha 9" },
  memberCount: 8,
  ...overrides,
})

describe("GroupList", () => {
  it("shows the count and each group with its facts and type", () => {
    render(
      <GroupList
        groups={[
          aGroup(),
          aGroup({ id: "g2", name: "Deskovky Vinohrady", type: "closed", memberCount: 4 }),
        ]}
      />,
    )

    expect(screen.getByText("2 skupiny")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Florbal Podvinný mlýn/ })).toHaveAttribute(
      "href",
      "/skupiny/g1",
    )
    expect(screen.getByText("Florbal · Praha 9 · 8 členů")).toBeInTheDocument()
    expect(screen.getByText("Veřejná")).toBeInTheDocument()
    expect(screen.getByText("Neveřejná – žádost o členství")).toBeInTheDocument()
  })

  it("empty: one sentence about the place, or about the filters with an activity", () => {
    const { rerender } = render(<GroupList groups={[]} />)
    expect(screen.getByText("V této lokalitě zatím žádná skupina není.")).toBeInTheDocument()

    rerender(
      <GroupList
        groups={[]}
        hasActivityFilter
      />,
    )
    expect(screen.getByText("Pro zvolené filtry zatím žádná skupina není.")).toBeInTheDocument()
  })

  it("loading", () => {
    render(
      <GroupList
        groups={[]}
        isLoading
      />,
    )
    expect(screen.getByLabelText("Načítám skupiny")).toBeInTheDocument()
    expect(screen.queryByText("0 skupin")).not.toBeInTheDocument()
  })

  it("error offers a retry", async () => {
    const onRetry = vi.fn()
    render(
      <GroupList
        groups={[]}
        error={new Error("HTTP 500")}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText("Skupiny se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
