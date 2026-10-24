import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DeactivateGroupButton } from "@/features/groups/components/DeactivateGroupButton"

const { api } = vi.hoisted(() => ({ api: { post: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const renderButton = () => {
  const onDeactivated = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DeactivateGroupButton
        groupId="g-florbal"
        groupName="Florbal Praha 9 – pokročilí"
        onDeactivated={onDeactivated}
      />
    </QueryClientProvider>,
  )
  return { onDeactivated }
}

beforeEach(() => {
  api.post.mockReset().mockResolvedValue(undefined)
})

// Figma D-07a
describe("DeactivateGroupButton", () => {
  it("asks first and says what happens", async () => {
    renderButton()
    await userEvent.click(screen.getByRole("button", { name: "Deaktivovat skupinu" }))

    const dialog = await screen.findByRole("dialog", { name: "Deaktivovat skupinu?" })
    expect(
      within(dialog).getByText(
        "Florbal Praha 9 – pokročilí zmizí z hledání a nikdo nový se do ní nepřidá. Skupina se nemaže, členové i historie zůstanou.",
      ),
    ).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole("button", { name: "Zpět" }))
    expect(api.post).not.toHaveBeenCalled()
  })

  it("confirming deactivates the group", async () => {
    const { onDeactivated } = renderButton()
    await userEvent.click(screen.getByRole("button", { name: "Deaktivovat skupinu" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.click(within(dialog).getByRole("button", { name: "Deaktivovat skupinu" }))

    expect(api.post).toHaveBeenCalledWith("groups/g-florbal/deactivate")
    await waitFor(() => expect(onDeactivated).toHaveBeenCalledOnce())
  })
})
