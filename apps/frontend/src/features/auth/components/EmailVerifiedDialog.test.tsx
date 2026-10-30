import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"
import { renderWithRouter } from "@/test/renderWithRouter"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { EmailVerifiedDialog } from "@/features/auth/components/EmailVerifiedDialog"
import { authClient } from "@/features/auth/lib/auth-client"
import { safeRedirect } from "@/features/auth/lib/redirect"
import type { VerificationResult } from "@/features/auth/lib/verification-result"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    sendVerificationEmail: vi.fn(() => Promise.resolve({ data: { status: true }, error: null })),
  },
}))

const verified: SessionUser = {
  id: "u1",
  email: "jana.novakova@example.com",
  name: "Jana Nováková",
  username: "",
  emailVerified: true,
}
const unverified: SessionUser = { ...verified, emailVerified: false }

type RenderOptions = {
  url?: string
  /** `null`: a page opened as usual. */
  result?: VerificationResult | null
  /** `null`: signed out. */
  user?: SessionUser | null
}

/**
 * The dialog in the root on `url`, opened the way /email-overen opens it:
 * with `result` in the history state.
 */
const renderDialog = ({ url = "/akce", result = {}, user = verified }: RenderOptions = {}) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), user ? { user } : null)
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <EmailVerifiedDialog />
    </QueryClientProvider>,
    { url, state: result ? { emailVerification: result } : undefined },
  )
}

describe("EmailVerifiedDialog", () => {
  it("over the page the sign-up started from: the e-mail is verified, the page's address stays clean", async () => {
    const { router } = await renderDialog({ url: "/akce?obsazenost=chybi" })

    const dialog = screen.getByRole("dialog", { name: "E-mail je ověřený" })
    expect(dialog).toHaveTextContent(
      "Teď se můžeš hlásit na akce a zakládat vlastní akce i skupiny.",
    )

    await userEvent.click(within(dialog).getByRole("button", { name: "Procházet akce" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(router.state.location.href).toBe("/akce?obsazenost=chybi")
  })

  it("closed, it's gone from the history entry: a reload or „Zpět“ to the page doesn't show it again", async () => {
    const { router } = await renderDialog({ url: "/akce/e1" })

    await userEvent.keyboard("{Escape}")

    await waitFor(() => expect(router.state.location.state.emailVerification).toBeUndefined())
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(router.history.location.state.emailVerification).toBeUndefined()
    expect(router.state.location.pathname).toBe("/akce/e1")
  })

  it("a page opened as usual has no dialog", async () => {
    await renderDialog({ result: null })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it.each([
    ["/akce/abc", "Zpět na akci"],
    ["/akce", "Procházet akce"],
    ["/akce/nova", "Pokračovat"],
    ["/akce/abc/sprava", "Pokračovat"],
    ["/skupiny/g1", "Pokračovat"],
  ])("on %s the button says „%s“", async (url, label) => {
    await renderDialog({ url })

    expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
  })

  it("signed out, a link that worked is a success too", async () => {
    await renderDialog({ user: null })

    expect(screen.getByRole("dialog", { name: "E-mail je ověřený" })).toBeInTheDocument()
  })

  it("an old link opened again once the e-mail is verified: says why, but no failure", async () => {
    await renderDialog({ result: { error: "TOKEN_EXPIRED" }, user: verified })

    const dialog = screen.getByRole("dialog", { name: "E-mail je ověřený" })
    expect(dialog).toHaveTextContent(
      "Odkaz už vypršel. Nevadí, e-mail už máš ověřený. Teď se můžeš hlásit na akce",
    )
    expect(within(dialog).queryByRole("button", { name: "Poslat odkaz znovu" })).toBeNull()
  })

  it("an expired link, signed in: says so and sends a new one that leads back to this page", async () => {
    await renderDialog({ url: "/akce/e1", result: { error: "TOKEN_EXPIRED" }, user: unverified })

    const dialog = screen.getByRole("dialog", { name: "E-mail se nepodařilo ověřit" })
    expect(dialog).toHaveTextContent("Odkaz už vypršel. Pošli si nový, platí 24 hodin.")
    expect(within(dialog).getByRole("button", { name: "Zpět na akci" })).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole("button", { name: "Poslat odkaz znovu" }))

    await waitFor(() => expect(authClient.sendVerificationEmail).toHaveBeenCalledOnce())
    const [{ email, callbackURL }] = vi.mocked(authClient.sendVerificationEmail).mock.lastCall!
    expect(email).toBe("jana.novakova@example.com")
    const from = new URL(callbackURL!).searchParams.get("from") ?? undefined
    expect(safeRedirect(from, "/akce")).toBe("/akce/e1")
    // the link is on its way (a toast says so): nothing left in the dialog
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("a link that didn't work, signed out: says so and leads to sign in, back to this page", async () => {
    await renderDialog({ url: "/akce/e1", result: { error: "INVALID_TOKEN" }, user: null })

    const dialog = screen.getByRole("dialog", { name: "E-mail se nepodařilo ověřit" })
    expect(dialog).toHaveTextContent("Odkaz je neplatný. Nový si pošleš po přihlášení.")
    const signIn = within(dialog).getByRole("link", { name: "Přihlásit se" })
    const loginUrl = new URL(signIn.getAttribute("href")!, window.location.origin)
    expect(loginUrl.pathname).toBe("/login")
    expect(safeRedirect(loginUrl.searchParams.get("from") ?? undefined, "/akce")).toBe("/akce/e1")
    expect(within(dialog).queryByRole("button", { name: "Poslat odkaz znovu" })).toBeNull()
  })

  it("a link that didn't work, over the sign-in of a page that needs it: „Přihlásit se“ leaves that sign-in as it is", async () => {
    const { router } = await renderDialog({
      url: "/login?from=%252Fmoje-akce",
      result: { error: "TOKEN_EXPIRED" },
      user: null,
    })

    const dialog = screen.getByRole("dialog", { name: "E-mail se nepodařilo ověřit" })
    // not a link to /login again: its `from` would be the sign-in, and that leads nowhere
    expect(within(dialog).queryByRole("link", { name: "Přihlásit se" })).toBeNull()
    await userEvent.click(within(dialog).getByRole("button", { name: "Přihlásit se" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(router.state.location.href).toBe("/login?from=%252Fmoje-akce")
  })

  it("an unknown code still says the link didn't work", async () => {
    await renderDialog({ result: { error: "SOMETHING_NEW" }, user: null })

    expect(screen.getByRole("dialog", { name: "E-mail se nepodařilo ověřit" })).toHaveTextContent(
      "Odkaz je neplatný.",
    )
  })

  it("doesn't claim success to a signed-in user who is still unverified", async () => {
    await renderDialog({ user: unverified })

    const dialog = screen.getByRole("dialog", { name: "E-mail zatím není ověřený" })
    expect(dialog).toHaveTextContent("Otevři odkaz z e-mailu, nebo si pošli nový.")
    expect(within(dialog).getByRole("button", { name: "Poslat odkaz znovu" })).toBeInTheDocument()
    expect(screen.queryByText("E-mail je ověřený")).not.toBeInTheDocument()
  })
})
