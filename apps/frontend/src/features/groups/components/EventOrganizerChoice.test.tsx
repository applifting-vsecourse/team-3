import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventOrganizerChoice } from "./EventOrganizerChoice"

const myGroups = vi.hoisted(() => vi.fn())
vi.mock("@/features/groups/hooks/useMyGroups", () => ({ useMyGroups: myGroups }))

const show = (groupId: string | null) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <EventOrganizerChoice
        viewerId="u1"
        groupId={groupId}
      />
    </QueryClientProvider>,
  )

beforeEach(() => {
  myGroups.mockReturnValue({
    sections: { running: [{ id: "g1", name: "Florbal Letná" }], pending: [], joined: [] },
  })
})

// PO 26. 11.: an admin of a group picks who organizes, the group's form has the visibility
describe("EventOrganizerChoice", () => {
  it("offers „Já“ and each group I run, the current one marked", async () => {
    await show(null)

    expect(screen.getByRole("link", { name: "Já" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Florbal Letná" })).toHaveAttribute(
      "href",
      "/skupiny/g1/akce/nova",
    )
  })

  it("the group's form marks the group", async () => {
    await show("g1")

    expect(screen.getByRole("link", { name: "Florbal Letná" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("link", { name: "Já" })).toHaveAttribute("href", "/akce/nova")
  })

  it("nothing for who runs no group", async () => {
    myGroups.mockReturnValue({ sections: { running: [], pending: [], joined: [] } })
    await show(null)

    expect(screen.queryByRole("navigation", { name: "Kdo akci pořádá" })).not.toBeInTheDocument()
  })
})
