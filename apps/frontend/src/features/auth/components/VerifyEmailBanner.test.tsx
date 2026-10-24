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

const renderBanner = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <VerifyEmailBanner email="jakub.kral@example.com" />
    </QueryClientProvider>,
  )

describe("VerifyEmailBanner", () => {
  it("says what is blocked until the e-mail is verified, and where the link went", () => {
    renderBanner()

    expect(screen.getByRole("status")).toHaveTextContent(/Ověřte svůj e-mail/)
    expect(screen.getByText("jakub.kral@example.com")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/přihlásit na akci ani nic založit/)
  })

  it("sends a new link that leads back into the app", async () => {
    renderBanner()

    await userEvent.click(screen.getByRole("button", { name: "Poslat odkaz znovu" }))

    await waitFor(() =>
      expect(authClient.sendVerificationEmail).toHaveBeenCalledWith({
        email: "jakub.kral@example.com",
        callbackURL: `${window.location.origin}/akce`,
      }),
    )
  })
})
