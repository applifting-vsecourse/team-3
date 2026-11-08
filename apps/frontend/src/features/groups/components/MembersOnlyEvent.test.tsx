import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { MembersOnlyEvent } from "@/features/groups/components/MembersOnlyEvent"

vi.mock("@/lib/api-client", () => ({ api: { get: vi.fn(), post: vi.fn() } }))

const group: GroupDetail = {
  id: "g-florbal",
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
  description: null,
  status: "active",
  admins: [{ id: "u-tomas", name: "Tomáš Dvořák" }],
  viewerMembership: null,
}

const render = async (overrides: Partial<GroupDetail> = {}) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(groupQueryOptions(group.id, "u-jakub").queryKey, {
    ...group,
    ...overrides,
  })
  const onMember = vi.fn()
  await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <MembersOnlyEvent
        groupId={group.id}
        viewerId="u-jakub"
        signInFrom="/akce/e38"
        onMember={onMember}
      />
    </QueryClientProvider>,
  )
  return { onMember }
}

// Figma A-05i (#70)
describe("MembersOnlyEvent", () => {
  it("says who organizes it and offers the way into a public group", async () => {
    await render()

    expect(
      screen.getByRole("heading", { level: 1, name: "Akce jen pro členy skupiny" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/pořádá skupina Florbal Podvinný mlýn pro své členy/),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Florbal Podvinný mlýn/ })).toHaveAttribute(
      "href",
      "/skupiny/g-florbal",
    )
    expect(screen.getByRole("button", { name: "Přidat se ke skupině" })).toBeInTheDocument()
  })

  it("a closed group is asked for membership", async () => {
    await render({ type: "closed" })

    expect(screen.getByRole("button", { name: "Požádat o členství" })).toBeInTheDocument()
  })

  it("once the viewer is a member, the event loads again", async () => {
    const { onMember } = await render({ viewerMembership: { role: "member", status: "active" } })

    expect(onMember).toHaveBeenCalled()
  })
})
