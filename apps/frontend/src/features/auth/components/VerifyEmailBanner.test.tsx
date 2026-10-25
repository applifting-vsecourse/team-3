import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api, HTTPError } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import { simulatedInboxKeys } from "@/features/auth/api/simulatedInbox"
import { VerifyEmailBanner } from "@/features/auth/components/VerifyEmailBanner"
import { authClient } from "@/features/auth/lib/auth-client"
import { safeRedirect } from "@/features/auth/lib/redirect"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    sendVerificationEmail: vi.fn(() => Promise.resolve({ data: { status: true }, error: null })),
  },
}))

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))

/** GET /api/me/simulated-inbox answers with these e-mails (console mailer). */
const inboxHas = (messages: object[]) =>
  vi.mocked(api.get).mockReturnValue({ json: () => Promise.resolve({ messages }) } as never)

// e-mails go out for real: the inbox is off (SIM-INBOX-CONTRACT.md)
const inboxOff = () =>
  vi.mocked(api.get).mockReturnValue({
    json: () =>
      Promise.reject(
        new HTTPError(
          new Response(null, { status: 404 }),
          new Request("http://localhost:4050/api/me/simulated-inbox"),
          {} as never,
        ),
      ),
  } as never)

beforeEach(() => {
  inboxOff()
})

const VERIFY_EMAIL = {
  id: "m1",
  subject: "Ověř si e-mail v HobbyHubu",
  sentAt: "2026-10-25T13:03:00.000Z",
  html: '<!DOCTYPE html><html lang="cs"><head></head><body><a href="http://localhost:4050/api/auth/verify-email?token=t1" target="_blank">Ověřit e-mail</a></body></html>',
}

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

  it("where e-mails are simulated, the verification e-mail opens in the app, its link in this tab", async () => {
    inboxHas([VERIFY_EMAIL])
    await renderBanner()

    await userEvent.click(await screen.findByRole("button", { name: "Otevřít e-mail (simulace)" }))

    const dialog = screen.getByRole("dialog", { name: "Simulovaná schránka" })
    expect(dialog).toHaveTextContent(
      "Na tomhle prostředí se e-maily neodesílají – tady je, co by ti přišlo.",
    )
    expect(dialog).toHaveTextContent("Ověř si e-mail v HobbyHubu")
    expect(dialog).toHaveTextContent("Pro jakub.kral@example.com · 25. 10. v 14:03")
    const email = within(dialog).getByTitle("Ověř si e-mail v HobbyHubu")
    expect(email).toHaveAttribute(
      "sandbox",
      "allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation",
    )
    // the template's button asks for a new window; here it takes the whole tab
    const srcDoc = email.getAttribute("srcdoc") ?? ""
    expect(srcDoc).toContain('href="http://localhost:4050/api/auth/verify-email?token=t1"')
    expect(srcDoc).toContain('target="_top"')
    expect(srcDoc).not.toContain("_blank")
    expect(srcDoc).toMatch(/^<!DOCTYPE html>/)
  })

  it("an empty simulated inbox says to send the link again", async () => {
    inboxHas([])
    await renderBanner()

    await userEvent.click(await screen.findByRole("button", { name: "Otevřít e-mail (simulace)" }))

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Zatím tu nic není – pošli si odkaz znovu.",
    )
  })

  it("where e-mails go out for real (404), the banner stays as it was", async () => {
    const queryClient = new QueryClient()
    await renderBanner({ queryClient })

    await waitFor(() =>
      expect(
        queryClient.getQueryState(simulatedInboxKeys.of("jakub.kral@example.com"))?.status,
      ).toBe("error"),
    )
    expect(screen.queryByRole("button", { name: /Otevřít e-mail/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Poslat odkaz znovu" })).toBeInTheDocument()
  })

  it("a link sent again shows up in the simulated inbox", async () => {
    inboxHas([])
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    await renderBanner({ queryClient })

    await resend()

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: simulatedInboxKeys.all() }),
    )
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
