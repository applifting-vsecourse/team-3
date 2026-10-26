import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useSignUp } from "@/features/auth/hooks/useSignUp"
import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    signUp: { email: vi.fn(() => Promise.resolve({ data: {}, error: null })) },
  },
}))
const signUpEmail = vi.mocked(authClient.signUp.email)

const renderSignUp = () => {
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useSignUp(), { wrapper }).result
}

const input = {
  name: "Jana Malá",
  email: "jana@example.com",
  password: "hobbyhub2026",
  termsAccepted: true,
  privacyAcknowledged: true,
}

describe("useSignUp", () => {
  it("sends both consents, which the API wants (#153), and where the e-mail link leads", async () => {
    const result = renderSignUp()

    await result.current.mutateAsync({ ...input, from: "/akce/e1" })

    expect(signUpEmail).toHaveBeenCalledWith({
      name: "Jana Malá",
      email: "jana@example.com",
      password: "hobbyhub2026",
      termsAccepted: true,
      privacyAcknowledged: true,
      callbackURL: `${window.location.origin}/email-overen?from=%2Fakce%2Fe1`,
    })
  })

  it("says in Czech when the API refuses the name, naming the character", async () => {
    signUpEmail.mockResolvedValueOnce({
      data: null,
      error: {
        code: "INVALID_NAME",
        status: 400,
        message: "Znak „<“ do jména nepatří. Jméno může obsahovat jen písmena…",
      },
    })
    const result = renderSignUp()

    await expect(result.current.mutateAsync(input)).rejects.toThrow(
      "Znak „<“ do jména nepatří. Jméno může obsahovat jen písmena…",
    )
  })
})
