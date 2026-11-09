import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useChangeEmail, useChangePassword } from "./useAccountMutations"

const clients = vi.hoisted(() => ({ changeEmail: vi.fn(), changePassword: vi.fn() }))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: clients }))
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
      })
    }
  >
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  clients.changeEmail.mockResolvedValue({ error: null })
  clients.changePassword.mockResolvedValue({ error: null })
})
describe("account changes use BetterAuth (#178)", () => {
  it("keeps change-email as a verification request with an in-app callback", async () => {
    const { result } = renderHook(useChangeEmail, { wrapper })
    await act(async () => result.current.mutateAsync("new@example.com"))
    expect(clients.changeEmail).toHaveBeenCalledWith({
      newEmail: "new@example.com",
      callbackURL: `${window.location.origin}/email-overen?from=%2Fprofil`,
    })
  })
  it("requires the old password and asks BetterAuth to revoke other sessions", async () => {
    const { result } = renderHook(useChangePassword, { wrapper })
    await act(async () =>
      result.current.mutateAsync({
        currentPassword: "old-password-123",
        newPassword: "new-password-456",
      }),
    )
    expect(clients.changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password-123",
      newPassword: "new-password-456",
      revokeOtherSessions: true,
    })
  })
  it("translates API errors without displaying their raw message", async () => {
    clients.changePassword.mockResolvedValue({
      error: { code: "PASSWORD_COMPROMISED", message: "raw server detail" },
    })
    const { result } = renderHook(useChangePassword, { wrapper })
    act(() =>
      result.current.mutate({
        currentPassword: "old-password-123",
        newPassword: "new-password-456",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain("uniklými hesly")
    expect(result.current.error?.message).not.toContain("raw server detail")
  })
})
