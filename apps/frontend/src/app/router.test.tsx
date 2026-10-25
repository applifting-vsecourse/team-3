import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

/** The app's own routes and pages on `url`, for a visitor (no session asked for). */
async function renderApp(url: string) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), null)
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
})
