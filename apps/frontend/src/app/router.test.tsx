import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

import type { Session } from "@/features/auth/api/authSessionQueryOptions"
import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { getSession: vi.fn(), resetPassword: vi.fn() },
}))

const user = { id: "u1", email: "user@example.com", name: "Jana Nováková", emailVerified: true }

/**
 * The app's own routes and pages on `url`, for a visitor or a signed-in user.
 * `cachedUser` is what the app already has of that user, e.g. still unverified
 * right after the sign-up; the server then says `user`.
 */
async function renderApp(
  url: string,
  {
    isSignedIn = false,
    cachedUser = user,
    isSessionUnavailable = false,
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }: {
    isSignedIn?: boolean
    cachedUser?: typeof user | null
    isSessionUnavailable?: boolean
    queryClient?: QueryClient
  } = {},
) {
  queryClient.setQueryData(
    authKeys.session(),
    isSignedIn && cachedUser ? { user: cachedUser } : null,
  )
  // what the server says when the session is fetched anew
  vi.mocked(authClient.getSession).mockResolvedValue({
    data: isSignedIn ? { user, session: {} } : null,
    error: null,
  })
  if (isSessionUnavailable) vi.mocked(authClient.getSession).mockRejectedValue(new Error("Offline"))
  const app = createRouter({
    ...router.options,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  await app.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={app} />
    </QueryClientProvider>,
  )
  return app
}

// the API answers every page's request with an empty list
const stubApi = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
      ),
    ),
  )

describe("router", () => {
  // the toaster in the root follows the system scheme; jsdom has no matchMedia
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  // DESIGN.md › Layout: „Every page keeps the app chrome“ – a broken shared
  // link still lands in HobbyHub
  it("an unknown address is a page of the app: the header, the 404 and the bottom navigation", async () => {
    await renderApp("/neco-co-neni")

    expect(
      await screen.findByRole("heading", { level: 1, name: "Stránka nenalezena" }),
    ).toBeInTheDocument()
    const header = screen.getByRole("banner")
    expect(within(header).getByRole("link", { name: "HobbyHub" })).toHaveAttribute("href", "/")
    expect(within(header).getByRole("link", { name: "Skupiny" })).toHaveAttribute(
      "href",
      "/skupiny",
    )
    // the header's navigation (desktop) and the bottom one (mobile)
    expect(screen.getAllByRole("navigation", { name: "Hlavní navigace" })).toHaveLength(2)
  })

  // inside the signed-in layout the 404 would get that layout's header on top of its own
  it("an unknown address under a signed-in page has the header once", async () => {
    stubApi()
    await renderApp("/moje/neco", { isSignedIn: true })

    expect(
      await screen.findByRole("heading", { level: 1, name: "Stránka nenalezena" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("banner")).toHaveLength(1)
    expect(document.querySelectorAll("main")).toHaveLength(1)
  })

  // #155: the result in a dialog over that page, not on an empty page of its own
  describe("the link in the verification e-mail (/email-overen, old links too)", () => {
    // where the sign-up started, as the link carries it: encoded once since #186,
    // twice in links sent before it (still valid for 24 h)
    const fromGroups = "/skupiny?q=volejbal"

    it.each([
      ["encoded once", encodeURIComponent(fromGroups)],
      ["encoded twice, the old format", encodeURIComponent(encodeURIComponent(fromGroups))],
    ])(
      "leads back to the page the sign-up started from, with „E-mail je ověřený“ over it (%s)",
      async (_, from) => {
        stubApi()
        // the app still has the session from before the link: unverified
        const app = await renderApp(`/email-overen?from=${from}`, {
          isSignedIn: true,
          cachedUser: { ...user, emailVerified: false },
        })

        // the session was fetched anew before the dialog trusted it: success,
        // never „not verified“ first
        expect(await screen.findByRole("dialog", { name: "E-mail je ověřený" })).toBeInTheDocument()
        expect(screen.queryByText(/Ověř si e-mail/)).not.toBeInTheDocument()
        expect(authClient.getSession).toHaveBeenCalled()
        // the page's own address, nothing added to it; „Zpět“ doesn't lead to /email-overen
        expect(app.state.location.href).toBe("/skupiny?q=volejbal")
        expect(app.history.length).toBe(1)
      },
    )

    it.each([null, { ...user, id: "other", email: "other@example.com" }])(
      "loads the new cookie session before entering a protected return page (cached=%j)",
      async (cachedUser) => {
        stubApi()
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        const app = await renderApp("/email-overen?from=%2Fmoje%2Fakce", {
          isSignedIn: true,
          cachedUser,
          queryClient,
        })
        expect(app.state.location.pathname).toBe("/moje/akce")
        const fresh = queryClient.getQueryData<Session>(authKeys.session())
        expect(fresh?.user.id).toBe(user.id)
        expect(fresh?.user.emailVerified).toBe(true)
        const dialog = await screen.findByRole("dialog", { name: "E-mail je ověřený" })
        expect(within(dialog).queryByRole("link", { name: "Přihlásit se" })).not.toBeInTheDocument()
      },
    )

    it("does not trust a cached account if refreshing the verification session fails", async () => {
      stubApi()
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const app = await renderApp("/email-overen?from=%2Fmoje%2Fakce", {
        isSignedIn: true,
        cachedUser: { ...user, id: "old-account" },
        isSessionUnavailable: true,
        queryClient,
      })
      expect(app.state.location.pathname).toBe("/login")
      expect(queryClient.getQueryData<Session>(authKeys.session())?.user).toBeUndefined()
    })

    it("a link that didn't work: the dialog explains it, over the events without `from`", async () => {
      stubApi()
      const app = await renderApp("/email-overen?error=TOKEN_EXPIRED")

      expect(
        await screen.findByRole("dialog", { name: "E-mail se nepodařilo ověřit" }),
      ).toBeInTheDocument()
      expect(app.state.location.pathname).toBe("/akce")
    })

    it("from a page that needs signing in, signed out: the sign-in leads there, with the dialog over it", async () => {
      stubApi()
      const app = await renderApp(`/email-overen?from=${encodeURIComponent("/moje-akce")}`)

      expect(await screen.findByRole("dialog", { name: "E-mail je ověřený" })).toBeInTheDocument()
      // the old address of Moje akce leads to its new one, the dialog along (#304)
      expect(app.state.location.href).toBe("/login?from=%2Fmoje%2Fakce")
    })

    it("the same with an old link, `from` encoded twice", async () => {
      stubApi()
      const from = encodeURIComponent(encodeURIComponent("/moje-akce"))
      const app = await renderApp(`/email-overen?from=${from}`)

      expect(await screen.findByRole("dialog", { name: "E-mail je ověřený" })).toBeInTheDocument()
      expect(app.state.location.pathname).toBe("/login")
    })
  })
  describe("opening a password reset link (#345)", () => {
    it("offers a new link immediately when the e-mail link expired or was used", async () => {
      stubApi()
      await renderApp("/reset-password?error=INVALID_TOKEN")

      expect(await screen.findByText(/Odkaz vypršel, už se použil/)).toBeInTheDocument()
      expect(screen.queryByLabelText("Nové heslo")).not.toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Poslat nový odkaz" })).toHaveAttribute(
        "href",
        "/zapomenute-heslo",
      )
    })

    it("offers a new link when an older direct link is rejected on submit", async () => {
      stubApi()
      vi.mocked(authClient.resetPassword).mockResolvedValueOnce({
        data: null,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid token",
          status: 400,
          statusText: "Bad Request",
        },
      })
      await renderApp("/reset-password?token=old-link")

      await userEvent.type(await screen.findByLabelText("Nové heslo"), "nove-heslo-2026")
      await userEvent.type(screen.getByLabelText("Nové heslo znovu"), "nove-heslo-2026")
      await userEvent.click(screen.getByRole("button", { name: "Nastavit heslo" }))

      expect(await screen.findByText(/Odkaz vypršel, už se použil/)).toBeInTheDocument()
      expect(screen.queryByLabelText("Nové heslo")).not.toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Poslat nový odkaz" })).toHaveAttribute(
        "href",
        "/zapomenute-heslo",
      )
    })

    it("takes the user to sign-in after saving the new password", async () => {
      stubApi()
      vi.mocked(authClient.resetPassword).mockResolvedValueOnce({
        data: { status: true },
        error: null,
      })
      const app = await renderApp("/reset-password?token=valid-link")

      await userEvent.type(await screen.findByLabelText("Nové heslo"), "nove-heslo-2026")
      await userEvent.type(screen.getByLabelText("Nové heslo znovu"), "nove-heslo-2026")
      await userEvent.click(screen.getByRole("button", { name: "Nastavit heslo" }))

      expect(await screen.findByRole("heading", { name: "Přihlášení" })).toBeInTheDocument()
      expect(app.state.location.pathname).toBe("/login")
      expect(app.history.length).toBe(1)
    })
  })

  // #198: what Google (through BetterAuth) sends back to the page the sign-in started on
  describe("back from Google with an error", () => {
    it("on /signup: the Czech message offers signing up with the e-mail", async () => {
      stubApi()
      await renderApp("/signup?error=access_denied")

      expect(
        await screen.findByText(
          "Registrace přes Google je zrušená. Zkus to znovu, nebo se zaregistruj e-mailem.",
        ),
      ).toBeInTheDocument()
    })

    it("on /login: an error raised before BetterAuth reads the state gets the general sentence", async () => {
      stubApi()
      await renderApp("/login?error=state_not_found")

      expect(
        await screen.findByText("Přihlášení přes Google se nepovedlo. Zkus to prosím znovu."),
      ).toBeInTheDocument()
    })
  })
})
