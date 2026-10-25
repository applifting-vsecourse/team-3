import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { VerifyEmailBanner } from "@/features/auth/components/VerifyEmailBanner"
import { authClient } from "@/features/auth/lib/auth-client"
import { safeRedirect } from "@/features/auth/lib/redirect"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    sendVerificationEmail: vi.fn(() => Promise.resolve({ data: { status: true }, error: null })),
  },
}))

const renderBanner = ({ url = "/", queryClient = new QueryClient() } = {}) =>
  renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <VerifyEmailBanner email="jakub.kral@example.com" />
    </QueryClientProvider>,
    { url },
  )

/** Sends a new link and returns where it leads after verifying. */
async function resend() {
  vi.mocked(authClient.sendVerificationEmail).mockClear()
  await userEvent.click(screen.getByRole("button", { name: "Poslat odkaz znovu" }))
  await waitFor(() => expect(authClient.sendVerificationEmail).toHaveBeenCalledOnce())
  const [{ email, callbackURL }] = vi.mocked(authClient.sendVerificationEmail).mock.lastCall!
  expect(email).toBe("jakub.kral@example.com")
  const link = new URL(callbackURL!)
  return {
    // the page saying whether it worked, in this app
    page: `${link.origin}${link.pathname}`,
    // where its „Pokračovat“ leads, read the way /email-overen reads it
    continueTo: safeRedirect(link.searchParams.get("from") ?? undefined, "/akce"),
  }
}

describe("VerifyEmailBanner", () => {
  it("says what is blocked until the e-mail is verified, and where the link went", async () => {
    await renderBanner()

    expect(screen.getByRole("status")).toHaveTextContent(/Ověř si e-mail/)
    expect(screen.getByText("jakub.kral@example.com")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/přihlásit na akci ani nic založit/)
  })

  it("a new link leads back to the page it was asked for on, like the one from the sign-up", async () => {
    await renderBanner({ url: "/akce/e1?tab=ucastnici" })

    expect(await resend()).toEqual({
      page: `${window.location.origin}/email-overen`,
      continueTo: "/akce/e1?tab=ucastnici",
    })
  })

  it("asked for after an expired link: leads where that link would have, not back to the error", async () => {
    // what the expired link from a sign-up on /akce/e1 led to
    const from = encodeURIComponent(encodeURIComponent("/akce/e1"))
    await renderBanner({ url: `/email-overen?error=TOKEN_EXPIRED&from=${from}` })

    expect((await resend()).continueTo).toBe("/akce/e1")
  })

  it("asked for on a password page: leads to the events, not back there", async () => {
    await renderBanner({ url: "/reset-password?token=abc" })

    expect(await resend()).toEqual({
      page: `${window.location.origin}/email-overen`,
      continueTo: "/akce",
    })
  })

  it("verified meanwhile (another tab): refreshes the session instead of showing an error", async () => {
    vi.mocked(authClient.sendVerificationEmail).mockResolvedValueOnce({
      data: null,
      error: { code: "EMAIL_ALREADY_VERIFIED", message: "Email is already verified", status: 400 },
    })
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    await renderBanner({ queryClient })

    await userEvent.click(screen.getByRole("button", { name: "Poslat odkaz znovu" }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["auth", "session"] }))
  })
})
