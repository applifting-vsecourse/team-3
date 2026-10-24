import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GroupManagement } from "@/features/groups/components/GroupManagement"

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ api }))

// Figma D-07: Tomáš's group with two requests and five members
const members = {
  requests: [
    { userId: "u-jakub", name: "Jakub Král", role: "member", since: "2026-10-21T10:00:00Z" },
    { userId: "u-petr", name: "Petr Holub", role: "member", since: "2026-10-22T10:00:00Z" },
  ],
  members: [
    { userId: "u-tomas", name: "Tomáš Dvořák", role: "admin", since: "2026-09-01T10:00:00Z" },
    { userId: "u-ondrej", name: "Ondřej Procházka", role: "member", since: "2026-09-02T10:00:00Z" },
  ],
}

const renderManagement = (isDesktop: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <GroupManagement
        groupId="g-florbal"
        isDesktop={isDesktop}
      />
    </QueryClientProvider>,
  )

beforeEach(() => {
  api.get.mockReset().mockReturnValue({ json: () => Promise.resolve(members) })
  api.post.mockReset().mockResolvedValue(undefined)
})

describe("GroupManagement", () => {
  it("desktop shows requests and members at once, admins labelled", async () => {
    renderManagement(true)

    expect(await screen.findByRole("heading", { name: "Žádosti (2)" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Členové (2)" })).toBeInTheDocument()
    expect(screen.getByText("Jakub Král")).toBeInTheDocument()
    expect(screen.getAllByText("Žádá o členství")).toHaveLength(2)
    expect(screen.getByText("Správce skupiny")).toBeInTheDocument()
    expect(screen.getByText("Člen skupiny")).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("groups/g-florbal/members")
  })

  it("mobile puts them in tabs", async () => {
    renderManagement(false)

    const requestsTab = await screen.findByRole("tab", { name: "Žádosti (2)" })
    expect(requestsTab).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Petr Holub")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("tab", { name: "Členové (2)" }))
    expect(screen.getByText("Ondřej Procházka")).toBeInTheDocument()
  })

  it("approving and rejecting call the request's endpoint", async () => {
    renderManagement(true)

    const jakub = (await screen.findByText("Jakub Král")).closest("li")!
    await userEvent.click(within(jakub).getByRole("button", { name: "Schválit" }))
    expect(api.post).toHaveBeenCalledWith("groups/g-florbal/requests/u-jakub/approve")

    const petr = screen.getByText("Petr Holub").closest("li")!
    await userEvent.click(within(petr).getByRole("button", { name: "Zamítnout" }))
    expect(api.post).toHaveBeenCalledWith("groups/g-florbal/requests/u-petr/reject")
  })

  it("no requests: one sentence instead of an empty list", async () => {
    api.get.mockReturnValue({ json: () => Promise.resolve({ ...members, requests: [] }) })
    renderManagement(true)

    expect(await screen.findByText("Žádné žádosti o členství teď nečekají.")).toBeInTheDocument()
  })
})
