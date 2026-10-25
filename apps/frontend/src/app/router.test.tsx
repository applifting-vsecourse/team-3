import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

const user = { id: "u1", email: "user@example.com", name: "Jana Nováková", emailVerified: true }

/** The app's own routes and pages on `url`, for a visitor or a signed-in user. */
async function renderApp(url: string, { isSignedIn = false } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), isSignedIn ? { user } : null)
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
}

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
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
        ),
      ),
    )
    await renderApp("/moje-akce/neco", { isSignedIn: true })

    expect(
      await screen.findByRole("heading", { level: 1, name: "Stránka nenalezena" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("banner")).toHaveLength(1)
    expect(document.querySelectorAll("main")).toHaveLength(1)
  })
})
