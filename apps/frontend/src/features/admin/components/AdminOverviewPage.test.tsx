import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { AdminOverviewPage } from "./AdminOverviewPage"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const overview = {
  hiddenEvents: [
    {
      id: "e1",
      title: "Placený kurz",
      startsAt: "2026-12-01T17:00:00Z",
      reason: "Placené služby",
      hiddenAt: "2026-11-26T10:00:00Z",
    },
  ],
  blockedUsers: [
    { id: "u9", name: "Spam Spamovič", blockedAt: "2026-11-26T11:00:00Z", reason: "Spam" },
  ],
}

const show = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AdminOverviewPage viewerId="admin" />
    </QueryClientProvider>,
  )

beforeEach(() => {
  api.get.mockReset().mockReturnValue({ json: () => Promise.resolve(overview) })
  api.post.mockReset().mockResolvedValue(undefined)
})

// PO 26. 11.: the superadmin's own section
describe("AdminOverviewPage", () => {
  it("lists the deactivated events with their reasons, leading to the detail", async () => {
    await show()

    const events = await screen.findByRole("region", { name: "Deaktivované akce (1)" })
    expect(within(events).getByRole("link", { name: "Placený kurz" })).toHaveAttribute(
      "href",
      "/akce/e1",
    )
    expect(within(events).getByText("Deaktivováno 26. 11. 2026 · Placené služby")).toBeVisible()
  })

  it("unblocks a blocked user", async () => {
    await show()

    const users = await screen.findByRole("region", { name: "Zablokovaní uživatelé (1)" })
    await userEvent.click(
      within(users).getByRole("button", { name: "Odblokovat uživatele Spam Spamovič" }),
    )
    expect(api.post).toHaveBeenCalledWith("admin/users/u9/unblock")
  })
})
