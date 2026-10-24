import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { VerifyEmailBanner } from "@/features/auth/components/VerifyEmailBanner"
import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    sendVerificationEmail: vi.fn(() => Promise.resolve({ data: { status: true }, error: null })),
  },
}))

const renderBanner = (queryClient = new QueryClient()) =>
  render(
    <QueryClientProvider client={queryClient}>
      <VerifyEmailBanner email="jakub.kral@example.com" />
    </QueryClientProvider>,
  )

describe("VerifyEmailBanner", () => {
  it("says what is blocked until the e-mail is verified, and where the link went", () => {
    renderBanner()

    expect(screen.getByRole("status")).toHaveTextContent(/Ověř si e-mail/)
    expect(screen.getByText("jakub.kral@example.com")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/přihlásit na akci ani nic založit/)
  })

  it("sends a new link that leads back into the app, to the page saying whether it worked", async () => {
    renderBanner()

    await userEvent.click(screen.getByRole("button", { name: "Poslat odkaz znovu" }))

    await waitFor(() =>
      expect(authClient.sendVerificationEmail).toHaveBeenCalledWith({
        email: "jakub.kral@example.com",
        callbackURL: `${window.location.origin}/email-overen`,
      }),
    )
  })

  it("verified meanwhile (another tab): refreshes the session instead of showing an error", async () => {
    vi.mocked(authClient.sendVerificationEmail).mockResolvedValueOnce({
      data: null,
      error: { code: "EMAIL_ALREADY_VERIFIED", message: "Email is already verified", status: 400 },
    })
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    renderBanner(queryClient)

    await userEvent.click(screen.getByRole("button", { name: "Poslat odkaz znovu" }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["auth", "session"] }))
  })
})
