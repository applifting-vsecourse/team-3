import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { getSession: vi.fn() },
}))

const user = { id: "u1", email: "user@example.com", name: "Jana Nováková", emailVerified: true }

/**
 * The app's own routes and pages on `url`, for a visitor or a signed-in user.
 * `cachedUser` is what the app already has of that user, e.g. still unverified
 * right after the sign-up; the server then says `user`.
 */
async function renderApp(url: string, { isSignedIn = false, cachedUser = user } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), isSignedIn ? { user: cachedUser } : null)
  // what the server says when the session is fetched anew
  vi.mocked(authClient.getSession).mockResolvedValue({
    data: isSignedIn ? { user, session: {} } : null,
    error: null,
  })
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
    await renderApp("/moje-akce/neco", { isSignedIn: true })

    expect(
      await screen.findByRole("heading", { level: 1, name: "Stránka nenalezena" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("banner")).toHaveLength(1)
    expect(document.querySelectorAll("main")).toHaveLength(1)
  })

  // #155: the result in a dialog over that page, not on an empty page of its own
  describe("the link in the verification e-mail (/email-overen, old links too)", () => {
    // where the sign-up started, as the link carries it (encoded twice)
    const fromGroups = encodeURIComponent(encodeURIComponent("/skupiny?q=volejbal"))

    it("leads back to the page the sign-up started from, with „E-mail je ověřený“ over it", async () => {
      stubApi()
      // the app still has the session from before the link: unverified
      const app = await renderApp(`/email-overen?from=${fromGroups}`, {
        isSignedIn: true,
        cachedUser: { ...user, emailVerified: false },
      })

      // the session was fetched anew before the dialog trusted it: success,
      // never „not verified“ first, and the banner „Ověř si e-mail“ is gone
      expect(await screen.findByRole("dialog", { name: "E-mail je ověřený" })).toBeInTheDocument()
      expect(screen.queryByText("E-mail zatím není ověřený")).not.toBeInTheDocument()
      expect(screen.queryByText(/Ověř si e-mail/)).not.toBeInTheDocument()
      expect(authClient.getSession).toHaveBeenCalled()
      // the page's own address, nothing added to it; „Zpět“ doesn't lead to /email-overen
      expect(app.state.location.href).toBe("/skupiny?q=volejbal")
      expect(app.history.length).toBe(1)
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
      const from = encodeURIComponent(encodeURIComponent("/moje-akce"))
      const app = await renderApp(`/email-overen?from=${from}`)

      expect(await screen.findByRole("dialog", { name: "E-mail je ověřený" })).toBeInTheDocument()
      expect(app.state.location.pathname).toBe("/login")
    })
  })
})
