import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"
import { renderWithRouter } from "@/test/renderWithRouter"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { getSession: vi.fn().mockResolvedValue({ data: null, error: null }) },
}))

const user = { id: "u1", email: "petra@example.com", name: "Petra Nováková", emailVerified: true }

describe("HeaderMenu", () => {
  it("leads to Můj profil from the user menu, the only way there on desktop (#178)", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(authKeys.session(), { user })
    const { router } = await renderWithRouter(
      <QueryClientProvider client={queryClient}>
        <HeaderMenu />
      </QueryClientProvider>,
    )

    await userEvent.click(
      screen.getByRole("button", { name: "PN – Petra Nováková, uživatelské menu" }),
    )
    await userEvent.click(await screen.findByRole("menuitem", { name: "Můj profil" }))

    expect(router.state.location.pathname).toBe("/profil")
  })

  // WCAG 2.5.3 Label in Name (#298): the button's name starts with the initials it shows
  it("names the avatar button with the initials it shows and whose menu it is", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(authKeys.session(), { user })
    await renderWithRouter(
      <QueryClientProvider client={queryClient}>
        <HeaderMenu />
      </QueryClientProvider>,
    )

    const button = screen.getByRole("button", { name: /Petra Nováková/ })
    expect(button.getAttribute("aria-label")?.startsWith(button.textContent.trim())).toBe(true)
  })
})
