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

    await userEvent.click(screen.getByRole("button", { name: "Uživatelské menu" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Můj profil" }))

    expect(router.state.location.pathname).toBe("/profil")
  })
})
